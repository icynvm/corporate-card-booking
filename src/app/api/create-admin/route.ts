import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST() {
    try {
        const supabase = createServerSupabase();

        // 1. Check if admin exists
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const existingAdmin = users.find(u => u.email === "admin@company.com");

        if (!existingAdmin) {
            // 2. Create auto-confirmed admin user
            const { data: authData, error: createError } = await supabase.auth.admin.createUser({
                email: "admin@company.com",
                password: "adminpassword123",
                email_confirm: true,
                user_metadata: {
                    name: "System Admin",
                    team: "Administration"
                }
            });

            if (createError) throw createError;

            // 3. Ensure profile exists (trigger might have caught it, but just in case)
            if (authData.user) {
                await supabase.from("profiles").upsert({
                    id: authData.user.id,
                    name: "System Admin",
                    team: "Administration",
                    role: "ADMIN"
                });
            }
        }

        return NextResponse.json({ success: true, email: "admin@company.com", password: "adminpassword123" });
    } catch (error: any) {
        console.error("Create admin error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
