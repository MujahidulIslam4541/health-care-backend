import { prisma } from "../lib/prisma"

export const seedAdmin=async()=>{
    try {
        const checkAdmin=await prisma.user.findFirst({})
        
    } catch (error) {
        console.log("not fidn admin",error)
    }
}

