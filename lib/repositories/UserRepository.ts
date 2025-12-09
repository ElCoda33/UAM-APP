import { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import bcrypt from 'bcrypt'

import {
    BaseRepository,
    IPaginationOptions,
    IPaginatedResult,
} from './BaseRepository'

export interface User {
    id: number
    email: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
    status: 'active' | 'inactive' | 'suspended' | 'disabled'
    national_id: string | null
    birth_date: string | null
    email_verified_at: string | null
    created_at: string
    updated_at: string
    section_id: number | null
    section_name: string | null
    role_ids: string | null
    roles: string | null
}

export class UserRepository extends BaseRepository {
    public async findAll(
        options: IPaginationOptions & {
            searchText?: string
            searchAttribute?: string
            status?: string[]
        }
    ): Promise<IPaginatedResult<User>> {
        const {
            page = 1,
            limit = 10,
            searchText,
            searchAttribute,
            status,
        } = options
        const offset = this.getOffset(page, limit)
        const params: any[] = []

        let whereClause = 'WHERE u.deleted_at IS NULL'

        if (searchText) {
            if (searchAttribute === 'roles') {
                whereClause += ` AND (
                    SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ') 
                    FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id 
                    WHERE ur_names.user_id = u.id
                ) LIKE ?`
                params.push(`%${searchText}%`)
            } else if (
                searchAttribute &&
                ['first_name', 'last_name', 'email', 'national_id'].includes(
                    searchAttribute
                )
            ) {
                whereClause += ` AND u.${searchAttribute} LIKE ?`
                params.push(`%${searchText}%`)
            } else {
                // Default search across multiple fields if no attribute specified or invalid
                whereClause += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.national_id LIKE ?)`
                params.push(
                    `%${searchText}%`,
                    `%${searchText}%`,
                    `%${searchText}%`,
                    `%${searchText}%`
                )
            }
        }

        if (status && status.length > 0) {
            whereClause += ` AND u.status IN (?)`
            params.push(status)
        }

        const countSql = `SELECT COUNT(*) as total FROM users u ${whereClause}`
        const [countRows] = await this.pool.query<RowDataPacket[]>(
            countSql,
            params
        )
        const total = countRows[0].total

        const query = `
            SELECT
                u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
                u.national_id, DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
                u.email_verified_at, u.created_at, u.updated_at,
                s.id AS section_id, s.name AS section_name,
                (SELECT GROUP_CONCAT(r.id SEPARATOR ',') 
                 FROM user_roles ur_ids JOIN roles r ON ur_ids.role_id = r.id 
                 WHERE ur_ids.user_id = u.id) AS role_ids,
                (SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ') 
                 FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id 
                 WHERE ur_names.user_id = u.id) AS roles
            FROM users u
            LEFT JOIN sections s ON u.section_id = s.id
            ${whereClause}
            ORDER BY u.last_name ASC, u.first_name ASC
            LIMIT ? OFFSET ?
        `

        params.push(limit, offset)

        const [rows] = await this.pool.query<RowDataPacket[]>(query, params)

        const data = rows.map((row) => ({
            ...row,
            birth_date: row.birth_date,
            email_verified_at: row.email_verified_at
                ? new Date(row.email_verified_at).toISOString()
                : null,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date(row.updated_at).toISOString(),
        })) as User[]

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        }
    }

    public async findAllWithFilters(options: {
        searchText?: string
        searchAttribute?: string
        status?: string[]
        sort?: { column: string; direction: 'ascending' | 'descending' }
    }): Promise<User[]> {
        const { searchText, searchAttribute, status, sort } = options
        const params: any[] = []

        let whereClause = 'WHERE u.deleted_at IS NULL'

        if (searchText) {
            if (searchAttribute === 'roles') {
                whereClause += ` AND (
                    SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ') 
                    FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id 
                    WHERE ur_names.user_id = u.id
                ) LIKE ?`
                params.push(`%${searchText}%`)
            } else if (
                searchAttribute &&
                ['first_name', 'last_name', 'email', 'national_id'].includes(
                    searchAttribute
                )
            ) {
                whereClause += ` AND u.${searchAttribute} LIKE ?`
                params.push(`%${searchText}%`)
            } else if (searchAttribute === 'status') {
                whereClause += ` AND (u.status LIKE ? OR REPLACE(u.status, '_', ' ') LIKE ?)`
                params.push(`%${searchText}%`, `%${searchText}%`)
            } else if (searchAttribute === 'email_verified_at') {
                if (searchText.toLowerCase().includes('verificado')) {
                    whereClause += ` AND u.email_verified_at IS NOT NULL`
                } else {
                    whereClause += ` AND u.email_verified_at IS NULL`
                }
            } else {
                // Default search across multiple fields
                whereClause += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.national_id LIKE ?)`
                params.push(
                    `%${searchText}%`,
                    `%${searchText}%`,
                    `%${searchText}%`,
                    `%${searchText}%`
                )
            }
        }

        if (status && status.length > 0) {
            whereClause += ` AND u.status IN (?)`
            params.push(status)
        }

        let orderBy = 'ORDER BY u.last_name ASC, u.first_name ASC'

        if (sort && sort.column) {
            let sortColumnDb = 'u.last_name'

            switch (sort.column) {
                case 'user':
                    sortColumnDb = 'u.first_name'
                    break
                case 'email':
                    sortColumnDb = 'u.email'
                    break
                case 'section_name':
                    sortColumnDb = 's.name'
                    break
                case 'status':
                    sortColumnDb = 'u.status'
                    break
                case 'national_id':
                    sortColumnDb = 'u.national_id'
                    break
                case 'birth_date':
                    sortColumnDb = 'u.birth_date'
                    break
                case 'created_at':
                    sortColumnDb = 'u.created_at'
                    break
                case 'updated_at':
                    sortColumnDb = 'u.updated_at'
                    break
                case 'email_verified_at':
                    sortColumnDb = 'u.email_verified_at'
                    break
            }
            const sortDirectionDb =
                sort.direction === 'descending' ? 'DESC' : 'ASC'

            orderBy = `ORDER BY ${sortColumnDb} ${sortDirectionDb}`
        }

        const query = `
            SELECT
                u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
                u.national_id, DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
                u.email_verified_at, u.created_at, u.updated_at,
                s.id AS section_id, s.name AS section_name,
                (SELECT GROUP_CONCAT(r.id SEPARATOR ',') 
                 FROM user_roles ur_ids JOIN roles r ON ur_ids.role_id = r.id 
                 WHERE ur_ids.user_id = u.id) AS role_ids,
                (SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ') 
                 FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id 
                 WHERE ur_names.user_id = u.id) AS roles
            FROM users u
            LEFT JOIN sections s ON u.section_id = s.id
            ${whereClause}
            ${orderBy}
        `

        const [rows] = await this.pool.query<RowDataPacket[]>(query, params)

        return rows.map((row) => ({
            ...row,
            birth_date: row.birth_date,
            email_verified_at: row.email_verified_at
                ? new Date(row.email_verified_at).toISOString()
                : null,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date(row.updated_at).toISOString(),
        })) as User[]
    }

    public async findById(id: number): Promise<User | null> {
        const query = `
            SELECT
                u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
                u.national_id, DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
                u.email_verified_at, u.created_at, u.updated_at,
                s.id AS section_id, s.name AS section_name,
                (SELECT GROUP_CONCAT(r.id SEPARATOR ',') FROM user_roles ur_ids JOIN roles r ON ur_ids.role_id = r.id WHERE ur_ids.user_id = u.id) AS role_ids,
                (SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ') FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id WHERE ur_names.user_id = u.id) AS roles
            FROM users u
            LEFT JOIN sections s ON u.section_id = s.id
            WHERE u.id = ? AND u.deleted_at IS NULL
        `

        const [rows] = await this.pool.query<RowDataPacket[]>(query, [id])

        if (rows.length === 0) return null

        const row = rows[0]

        return {
            ...row,
            birth_date: row.birth_date,
            email_verified_at: row.email_verified_at
                ? new Date(row.email_verified_at).toISOString()
                : null,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date(row.updated_at).toISOString(),
        } as User
    }

    public async create(userData: any): Promise<number> {
        const connection = await this.getConnection()

        try {
            await connection.beginTransaction()

            // Check for existing email
            const [existingEmail] = await connection.query<RowDataPacket[]>(
                'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
                [userData.email]
            )

            if (existingEmail.length > 0) {
                throw new Error(
                    `El email '${userData.email}' ya está registrado.`
                )
            }

            // Check for existing national_id
            if (userData.national_id) {
                const [existingNationalId] = await connection.query<
                    RowDataPacket[]
                >(
                    'SELECT id FROM users WHERE national_id = ? AND deleted_at IS NULL',
                    [userData.national_id]
                )

                if (existingNationalId.length > 0) {
                    throw new Error(
                        `El ID Nacional '${userData.national_id}' ya está registrado.`
                    )
                }
            }

            const hashedPassword = userData.password
                ? await bcrypt.hash(userData.password, 10)
                : null

            const query = `
                INSERT INTO users (
                    email, password_hash, first_name, last_name, national_id, status, 
                    birth_date, section_id, avatar_url, created_at, updated_at, deleted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
            `

            const params = [
                userData.email,
                hashedPassword,
                userData.first_name || null,
                userData.last_name || null,
                userData.national_id || null,
                userData.status,
                userData.birth_date || null,
                userData.section_id || null,
                userData.avatar_url || null,
            ]

            const [result] = await connection.query<ResultSetHeader>(
                query,
                params
            )
            const newUserId = result.insertId

            if (userData.role_ids && userData.role_ids.length > 0) {
                const userRolesValues = userData.role_ids.map(
                    (roleId: number) => [newUserId, roleId, new Date()]
                )

                await connection.query(
                    'INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ?',
                    [userRolesValues]
                )
            }

            await connection.commit()

            return newUserId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    public async update(id: number, userData: any): Promise<boolean> {
        const connection = await this.getConnection()

        try {
            await connection.beginTransaction()

            // Check for existing email if changed
            if (userData.email) {
                const [existingEmail] = await connection.query<RowDataPacket[]>(
                    'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL',
                    [userData.email, id]
                )

                if (existingEmail.length > 0) {
                    throw new Error(
                        `El email '${userData.email}' ya está en uso.`
                    )
                }
            }

            // Check for existing national_id if changed
            if (userData.national_id) {
                const [existingNationalId] = await connection.query<
                    RowDataPacket[]
                >(
                    'SELECT id FROM users WHERE national_id = ? AND id != ? AND deleted_at IS NULL',
                    [userData.national_id, id]
                )

                if (existingNationalId.length > 0) {
                    throw new Error(
                        `El ID Nacional '${userData.national_id}' ya está en uso.`
                    )
                }
            }

            const { role_ids, ...fieldsToUpdate } = userData
            const setClauses: string[] = []
            const params: any[] = []

            Object.entries(fieldsToUpdate).forEach(([key, value]) => {
                if (value !== undefined) {
                    setClauses.push(`${key} = ?`)
                    params.push(value === '' ? null : value)
                }
            })

            if (setClauses.length > 0) {
                setClauses.push('updated_at = NOW()')
                params.push(id)
                const updateQuery = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`

                await connection.query(updateQuery, params)
            }

            if (role_ids !== undefined) {
                await connection.query(
                    'DELETE FROM user_roles WHERE user_id = ?',
                    [id]
                )
                if (role_ids.length > 0) {
                    const userRolesValues = role_ids.map((roleId: number) => [
                        id,
                        roleId,
                        new Date(),
                    ])

                    await connection.query(
                        'INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ?',
                        [userRolesValues]
                    )
                }
            }

            await connection.commit()

            return true
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    public async delete(id: number): Promise<boolean> {
        const query =
            "UPDATE users SET status = 'disabled', deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL"
        const [result] = await this.pool.query<ResultSetHeader>(query, [id])

        return result.affectedRows > 0
    }

    public async getPasswordHash(id: number): Promise<string | null> {
        const [rows] = await this.pool.query<RowDataPacket[]>(
            'SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL',
            [id]
        )

        if (rows.length === 0) return null

        return rows[0].password_hash
    }

    public async updatePassword(
        id: number,
        passwordHash: string
    ): Promise<boolean> {
        const [result] = await this.pool.query<ResultSetHeader>(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
            [passwordHash, id]
        )

        return result.affectedRows > 0
    }
}
