import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Seed Users
    const manager = await prisma.user.upsert({
        where: { email: "manager@company.com" },
        update: {},
        create: {
            name: "Sarah Johnson",
            email: "manager@company.com",
            department: "Marketing",
            role: Role.MANAGER,
        },
    });

    const faUser = await prisma.user.upsert({
        where: { email: "finance@company.com" },
        update: {},
        create: {
            name: "Michael Chen",
            email: "finance@company.com",
            department: "Finance & Accounting",
            role: Role.FA,
        },
    });

    const employee = await prisma.user.upsert({
        where: { email: "employee@company.com" },
        update: {},
        create: {
            name: "Alex Williams",
            email: "employee@company.com",
            department: "Digital Marketing",
            role: Role.USER,
        },
    });

    // Seed Projects
    const project1 = await prisma.project.upsert({
        where: { id: "proj-001" },
        update: {},
        create: {
            id: "proj-001",
            projectName: "Q1 Digital Campaign 2026",
            totalBudget: 500000,
            remainingBudget: 500000,
        },
    });

    const project2 = await prisma.project.upsert({
        where: { id: "proj-002" },
        update: {},
        create: {
            id: "proj-002",
            projectName: "Brand Awareness Initiative",
            totalBudget: 250000,
            remainingBudget: 250000,
        },
    });

    const project3 = await prisma.project.upsert({
        where: { id: "proj-003" },
        update: {},
        create: {
            id: "proj-003",
            projectName: "Product Launch Campaign",
            totalBudget: 750000,
            remainingBudget: 750000,
        },
    });

    console.log("✅ Database seeded successfully!");
    console.log({ manager, faUser, employee, project1, project2, project3 });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
