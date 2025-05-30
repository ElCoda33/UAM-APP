// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth"; // Ajusta la ruta a tu archivo authOptions

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };