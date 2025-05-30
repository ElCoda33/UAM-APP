export async function GET() {
    return new Response('hola', {
        status: 200,
        // headers: { 'Set-Cookie': `token=${token?.value}` },
    })
}
