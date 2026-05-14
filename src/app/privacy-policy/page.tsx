import { GlassCard } from "@/components/ui/GlassCard";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F1A] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Privacy <span className="gradient-text">Policy</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">Last updated: May 14, 2024</p>
                </div>

                <GlassCard className="prose prose-blue dark:prose-invert max-w-none !p-8 sm:!p-12">
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">1. Introduction</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            Welcome to <strong>Reservation Credit Card</strong> ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your data when you use our application and link your Facebook Marketing accounts.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">2. Data We Collect</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">We collect information that you provide directly to us, including:</p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
                            <li><strong>Identity Data:</strong> Full name, department, and company email.</li>
                            <li><strong>Financial Data:</strong> Corporate credit card request details and approved budgets.</li>
                            <li><strong>Facebook Data:</strong> When you connect your Facebook account, we collect your <strong>Access Token</strong>, <strong>User ID</strong>, and <strong>Campaign Data</strong> (name, status, and spend) via the Facebook Marketing API.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">3. How We Use Your Data</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">We use the collected data for the following purposes:</p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
                            <li>To process and manage corporate credit card requests.</li>
                            <li>To monitor and track Facebook Ad campaign performance against approved budgets.</li>
                            <li>To provide real-time alerts for over-spending on linked campaigns.</li>
                            <li>To maintain an audit log of all financial activities for company compliance.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">4. Facebook Data Usage & Disclosure</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            Our application requests access to your Facebook Marketing data solely to provide budget-tracking features. We do not sell, rent, or share your Facebook data with third parties. We only transmit this data between our secure servers and the official Facebook Graph API.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">5. Data Security</h2>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            We implement industry-standard security measures, including encryption for Facebook Access Tokens stored in our database. Access to this data is restricted to authorized users within your organization based on assigned roles (Admin, Manager, User).
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">6. Your Rights</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
                            <li>View and update your profile information.</li>
                            <li>Revoke Facebook API access at any time through your Profile settings.</li>
                            <li>Request the deletion of your account and all associated data.</li>
                        </ul>
                    </section>

                    <section className="mb-0 border-t border-gray-100 dark:border-white/5 pt-8 mt-8">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Contact Us</h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            If you have any questions about this Privacy Policy, please contact us at: <br />
                            <span className="text-brand-500 font-medium">dev@company.com</span>
                        </p>
                    </section>
                </GlassCard>

                <div className="text-center mt-12">
                    <p className="text-gray-500 text-sm">
                        &copy; 2024 Reservation Credit Card. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
