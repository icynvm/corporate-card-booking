"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Lang = "en" | "th";

interface LanguageContextType {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: string) => string;
}

const translations: Record<Lang, Record<string, string>> = {
    en: {
        // Sidebar
        "nav.dashboard": "Dashboard",
        "nav.newRequest": "New Request",
        "nav.myRequests": "My Requests",
        "nav.auditLogs": "Audit Logs",
        "nav.emailSettings": "Email Settings",
        "nav.adminPanel": "Admin Panel",
        "nav.logout": "Logout",

        // Dashboard
        "dash.title": "Dashboard",
        "dash.subtitle": "Overview of your requests and spending",
        "dash.totalRequests": "Total Requests",
        "dash.pendingApproval": "Pending Approval",
        "dash.approved": "Approved",
        "dash.totalSpending": "Total Spending",
        "dash.recentRequests": "Recent Requests",
        "dash.filterStatus": "Filter by Status",
        "dash.filterBilling": "Filter by Billing",
        "dash.filterProject": "Filter by Project",
        "dash.all": "All",
        "dash.noRequests": "No requests found",

        // My Requests
        "myReq.title": "My Requests",
        "myReq.subtitle": "View and manage your submitted requests",
        "myReq.downloadPdf": "Download PDF",
        "myReq.cancel": "Cancel",
        "myReq.uploadSigned": "Upload Signed PDF",
        "myReq.noRequests": "No requests yet",
        "myReq.noRequestsDesc": "Create your first request to get started.",
        "myReq.createNew": "Create New Request",
        "myReq.cancelled": "This request has been cancelled",

        // Request Form
        "form.title": "New Card",
        "form.titleHighlight": "Request",
        "form.subtitle": "Fill in the details below to request corporate card usage.",
        "form.personalInfo": "Personal Information",
        "form.fullName": "Full Name",
        "form.department": "Department",
        "form.contactNo": "Contact No.",
        "form.email": "E-Mail",
        "form.projectName": "Project Name (type to search or create)",
        "form.requestDetails": "Request Details",
        "form.objective": "Objective",
        "form.bookingDate": "Booking Date",
        "form.startDate": "Start Date",
        "form.endDate": "End Date",
        "form.amount": "Amount (THB)",
        "form.billingType": "Billing Type",
        "form.channels": "Promotional Channels",
        "form.submit": "Submit Request",
        "form.submitting": "Submitting...",

        // Login
        "login.title": "Welcome Back",
        "login.subtitle": "Sign in to your account",
        "login.email": "Email Address",
        "login.password": "Password",
        "login.submit": "Sign In",
        "login.signingIn": "Signing In...",
        "login.noAccount": "Don't have an account?",
        "login.register": "Register",

        // Register
        "reg.title": "Create Account",
        "reg.subtitle": "Register for a new account",
        "reg.name": "Full Name",
        "reg.email": "Email Address",
        "reg.password": "Password",
        "reg.department": "Department",
        "reg.submit": "Register",
        "reg.registering": "Registering...",
        "reg.hasAccount": "Already have an account?",
        "reg.login": "Sign in",
        "reg.otpTitle": "Verify Email",
        "reg.otpSubtitle": "Enter the 6-digit code sent to your email",
        "reg.otpSubmit": "Verify",
        "reg.otpVerifying": "Verifying...",

        // Email Settings
        "emailSet.title": "Email",
        "emailSet.titleHighlight": "Settings",
        "emailSet.subtitle": "Configure the recipient and CC email addresses for request notifications sent to managers.",
        "emailSet.to": "To (Manager Email)",
        "emailSet.toHelp": "The primary recipient email(s) for request notifications. Separate multiple with commas.",
        "emailSet.cc": "CC (Carbon Copy)",
        "emailSet.ccHelp": "Additional email(s) to CC on request notifications. Separate multiple with commas.",
        "emailSet.save": "Save Settings",
        "emailSet.saving": "Saving...",
        "emailSet.success": "Email settings saved successfully!",

        // Admin
        "admin.title": "Admin",
        "admin.titleHighlight": "Panel",
        "admin.subtitle": "Manage all requests and review submissions",
        "admin.allRequests": "All Requests",
        "admin.filterStatus": "Filter Status",
        "admin.changeStatus": "Change Status",
        "admin.viewDetails": "View Details",
        "admin.noRequests": "No requests found",

        // Audit Logs
        "audit.title": "Audit",
        "audit.titleHighlight": "Logs",
        "audit.subtitle": "Track all system activities and changes",
        "audit.noLogs": "No audit logs found",

        // Common
        "common.loading": "Loading...",
        "common.error": "Error",
        "common.save": "Save",
        "common.cancel": "Cancel",
        "common.delete": "Delete",
        "common.confirm": "Confirm",
        "common.back": "Back",
        "common.search": "Search",
    },
    th: {
        // Sidebar
        "nav.dashboard": "เนเธ”เธเธเธญเธฃเนเธ”",
        "nav.newRequest": "เธเธณเธเธญเนเธซเธกเน",
        "nav.myRequests": "เธเธณเธเธญเธเธญเธเธเธฑเธ",
        "nav.auditLogs": "เธเธฑเธเธ—เธถเธเธเธดเธเธเธฃเธฃเธก",
        "nav.emailSettings": "เธ•เธฑเนเธเธเนเธฒเธญเธตเน€เธกเธฅ",
        "nav.adminPanel": "เนเธเธเธเธนเนเธ”เธนเนเธฅเธฃเธฐเธเธ",
        "nav.logout": "เธญเธญเธเธเธฒเธเธฃเธฐเธเธ",

        // Dashboard
        "dash.title": "เนเธ”เธเธเธญเธฃเนเธ”",
        "dash.subtitle": "เธ เธฒเธเธฃเธงเธกเธเธณเธเธญเนเธฅเธฐเธเธฒเธฃเนเธเนเธเนเธฒเธข",
        "dash.totalRequests": "เธเธณเธเธญเธ—เธฑเนเธเธซเธกเธ”",
        "dash.pendingApproval": "เธฃเธญเธญเธเธธเธกเธฑเธ•เธด",
        "dash.approved": "เธญเธเธธเธกเธฑเธ•เธดเนเธฅเนเธง",
        "dash.totalSpending": "เธขเธญเธ”เนเธเนเธเนเธฒเธขเธ—เธฑเนเธเธซเธกเธ”",
        "dash.recentRequests": "เธเธณเธเธญเธฅเนเธฒเธชเธธเธ”",
        "dash.filterStatus": "เธเธฃเธญเธเธ•เธฒเธกเธชเธ–เธฒเธเธฐ",
        "dash.filterBilling": "เธเธฃเธญเธเธ•เธฒเธกเธเธฒเธฃเน€เธฃเธตเธขเธเน€เธเนเธ",
        "dash.filterProject": "เธเธฃเธญเธเธ•เธฒเธกเนเธเธฃเธเธเธฒเธฃ",
        "dash.all": "เธ—เธฑเนเธเธซเธกเธ”",
        "dash.noRequests": "เนเธกเนเธเธเธเธณเธเธญ",

        // My Requests
        "myReq.title": "เธเธณเธเธญเธเธญเธเธเธฑเธ",
        "myReq.subtitle": "เธ”เธนเนเธฅเธฐเธเธฑเธ”เธเธฒเธฃเธเธณเธเธญเธ—เธตเนเธชเนเธเนเธฅเนเธง",
        "myReq.downloadPdf": "เธ”เธฒเธงเธเนเนเธซเธฅเธ” PDF",
        "myReq.cancel": "เธขเธเน€เธฅเธดเธ",
        "myReq.uploadSigned": "เธญเธฑเธเนเธซเธฅเธ” PDF เธ—เธตเนเธฅเธเธเธฒเธก",
        "myReq.noRequests": "เธขเธฑเธเนเธกเนเธกเธตเธเธณเธเธญ",
        "myReq.noRequestsDesc": "เธชเธฃเนเธฒเธเธเธณเธเธญเนเธฃเธเธเธญเธเธเธธเธ“เน€เธเธทเนเธญเน€เธฃเธดเนเธกเธ•เนเธ",
        "myReq.createNew": "เธชเธฃเนเธฒเธเธเธณเธเธญเนเธซเธกเน",
        "myReq.cancelled": "เธเธณเธเธญเธเธตเนเธ–เธนเธเธขเธเน€เธฅเธดเธเนเธฅเนเธง",

        // Request Form
        "form.title": "เธเธณเธเธญเนเธซเธกเน",
        "form.titleHighlight": "เธเธฑเธ•เธฃเน€เธเธฃเธ”เธดเธ•",
        "form.subtitle": "เธเธฃเธญเธเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธ”เนเธฒเธเธฅเนเธฒเธเน€เธเธทเนเธญเธเธญเนเธเนเธเธฑเธ•เธฃเน€เธเธฃเธ”เธดเธ•เธญเธเธเนเธเธฃ",
        "form.personalInfo": "เธเนเธญเธกเธนเธฅเธชเนเธงเธเธ•เธฑเธง",
        "form.fullName": "เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ",
        "form.department": "เนเธเธเธ",
        "form.contactNo": "เน€เธเธญเธฃเนเธ•เธดเธ”เธ•เนเธญ",
        "form.email": "เธญเธตเน€เธกเธฅ",
        "form.projectName": "เธเธทเนเธญเนเธเธฃเธเธเธฒเธฃ (เธเธดเธกเธเนเน€เธเธทเนเธญเธเนเธเธซเธฒเธซเธฃเธทเธญเธชเธฃเนเธฒเธเนเธซเธกเน)",
        "form.requestDetails": "เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธฒเธฃเธเธญเนเธเน",
        "form.objective": "เธงเธฑเธ•เธ–เธธเธเธฃเธฐเธชเธเธเน",
        "form.bookingDate": "เธงเธฑเธเธ—เธตเนเธชเธฑเนเธเธเธทเนเธญ",
        "form.startDate": "เธงเธฑเธเน€เธฃเธดเนเธกเธ•เนเธ",
        "form.endDate": "เธงเธฑเธเธชเธดเนเธเธชเธธเธ”",
        "form.amount": "เธเธณเธเธงเธเน€เธเธดเธ (เธเธฒเธ—)",
        "form.billingType": "เธเธฃเธฐเน€เธ เธ—เธเธฒเธฃเน€เธฃเธตเธขเธเน€เธเนเธ",
        "form.channels": "เธเนเธญเธเธ—เธฒเธเนเธเธฉเธ“เธฒ",
        "form.submit": "เธชเนเธเธเธณเธเธญ",
        "form.submitting": "เธเธณเธฅเธฑเธเธชเนเธ...",

        // Login
        "login.title": "เธขเธดเธเธ”เธตเธ•เนเธญเธเธฃเธฑเธ",
        "login.subtitle": "เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเธฑเธเธเธตเธเธญเธเธเธธเธ“",
        "login.email": "เธญเธตเน€เธกเธฅ",
        "login.password": "เธฃเธซเธฑเธชเธเนเธฒเธ",
        "login.submit": "เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ",
        "login.signingIn": "เธเธณเธฅเธฑเธเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ...",
        "login.noAccount": "เธขเธฑเธเนเธกเนเธกเธตเธเธฑเธเธเธต?",
        "login.register": "เธฅเธเธ—เธฐเน€เธเธตเธขเธ",

        // Register
        "reg.title": "เธชเธฃเนเธฒเธเธเธฑเธเธเธต",
        "reg.subtitle": "เธฅเธเธ—เธฐเน€เธเธตเธขเธเธเธฑเธเธเธตเนเธซเธกเน",
        "reg.name": "เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ",
        "reg.email": "เธญเธตเน€เธกเธฅ",
        "reg.password": "เธฃเธซเธฑเธชเธเนเธฒเธ",
        "reg.department": "เนเธเธเธ",
        "reg.submit": "เธฅเธเธ—เธฐเน€เธเธตเธขเธ",
        "reg.registering": "เธเธณเธฅเธฑเธเธฅเธเธ—เธฐเน€เธเธตเธขเธ...",
        "reg.hasAccount": "เธกเธตเธเธฑเธเธเธตเธญเธขเธนเนเนเธฅเนเธง?",
        "reg.login": "เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ",
        "reg.otpTitle": "เธขเธทเธเธขเธฑเธเธญเธตเน€เธกเธฅ",
        "reg.otpSubtitle": "เธเธฃเธญเธเธฃเธซเธฑเธช 6 เธซเธฅเธฑเธเธ—เธตเนเธชเนเธเนเธเธขเธฑเธเธญเธตเน€เธกเธฅเธเธญเธเธเธธเธ“",
        "reg.otpSubmit": "เธขเธทเธเธขเธฑเธ",
        "reg.otpVerifying": "เธเธณเธฅเธฑเธเธขเธทเธเธขเธฑเธ...",

        // Email Settings
        "emailSet.title": "เธ•เธฑเนเธเธเนเธฒ",
        "emailSet.titleHighlight": "เธญเธตเน€เธกเธฅ",
        "emailSet.subtitle": "เธเธณเธซเธเธ”เธเนเธฒเธญเธตเน€เธกเธฅเธเธนเนเธฃเธฑเธเนเธฅเธฐ CC เธชเธณเธซเธฃเธฑเธเธเธฒเธฃเนเธเนเธเน€เธ•เธทเธญเธเธเธณเธเธญ",
        "emailSet.to": "เธ–เธถเธ (เธญเธตเน€เธกเธฅเธเธนเนเธเธฑเธ”เธเธฒเธฃ)",
        "emailSet.toHelp": "เธญเธตเน€เธกเธฅเธเธนเนเธฃเธฑเธเธซเธฅเธฑเธเธชเธณเธซเธฃเธฑเธเธเธฒเธฃเนเธเนเธเน€เธ•เธทเธญเธ เธเธฑเนเธเธซเธฅเธฒเธขเธญเธตเน€เธกเธฅเธ”เนเธงเธขเน€เธเธฃเธทเนเธญเธเธซเธกเธฒเธขเธเธธเธฅเธ เธฒเธ",
        "emailSet.cc": "CC (เธชเธณเน€เธเธฒเธ–เธถเธ)",
        "emailSet.ccHelp": "เธญเธตเน€เธกเธฅเน€เธเธดเนเธกเน€เธ•เธดเธกเธชเธณเธซเธฃเธฑเธ CC เธเธฑเนเธเธซเธฅเธฒเธขเธญเธตเน€เธกเธฅเธ”เนเธงเธขเน€เธเธฃเธทเนเธญเธเธซเธกเธฒเธขเธเธธเธฅเธ เธฒเธ",
        "emailSet.save": "เธเธฑเธเธ—เธถเธเธเธฒเธฃเธ•เธฑเนเธเธเนเธฒ",
        "emailSet.saving": "เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...",
        "emailSet.success": "เธเธฑเธเธ—เธถเธเธเธฒเธฃเธ•เธฑเนเธเธเนเธฒเธญเธตเน€เธกเธฅเธชเธณเน€เธฃเนเธ!",

        // Admin
        "admin.title": "เนเธเธ",
        "admin.titleHighlight": "เธเธนเนเธ”เธนเนเธฅเธฃเธฐเธเธ",
        "admin.subtitle": "เธเธฑเธ”เธเธฒเธฃเธเธณเธเธญเธ—เธฑเนเธเธซเธกเธ”เนเธฅเธฐเธ•เธฃเธงเธเธชเธญเธเน€เธญเธเธชเธฒเธฃ",
        "admin.allRequests": "เธเธณเธเธญเธ—เธฑเนเธเธซเธกเธ”",
        "admin.filterStatus": "เธเธฃเธญเธเธชเธ–เธฒเธเธฐ",
        "admin.changeStatus": "เน€เธเธฅเธตเนเธขเธเธชเธ–เธฒเธเธฐ",
        "admin.viewDetails": "เธ”เธนเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”",
        "admin.noRequests": "เนเธกเนเธเธเธเธณเธเธญ",

        // Audit Logs
        "audit.title": "เธเธฑเธเธ—เธถเธ",
        "audit.titleHighlight": "เธเธดเธเธเธฃเธฃเธก",
        "audit.subtitle": "เธ•เธดเธ”เธ•เธฒเธกเธเธดเธเธเธฃเธฃเธกเนเธฅเธฐเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเนเธเธฅเธเธ—เธฑเนเธเธซเธกเธ”เนเธเธฃเธฐเธเธ",
        "audit.noLogs": "เนเธกเนเธเธเธเธฑเธเธ—เธถเธเธเธดเธเธเธฃเธฃเธก",

        // Common
        "common.loading": "เธเธณเธฅเธฑเธเนเธซเธฅเธ”...",
        "common.error": "เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”",
        "common.save": "เธเธฑเธเธ—เธถเธ",
        "common.cancel": "เธขเธเน€เธฅเธดเธ",
        "common.delete": "เธฅเธ",
        "common.confirm": "เธขเธทเธเธขเธฑเธ",
        "common.back": "เธเธฅเธฑเธ",
        "common.search": "เธเนเธเธซเธฒ",
    },
};

const LanguageContext = createContext<LanguageContextType>({
    lang: "en",
    setLang: () => { },
    t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>("en");

    const setLang = useCallback((l: Lang) => {
        setLangState(l);
        if (typeof window !== "undefined") {
            localStorage.setItem("app_lang", l);
        }
    }, []);

    // Load saved language on mount
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("app_lang") as Lang | null;
            if (saved && (saved === "en" || saved === "th")) {
                setLangState(saved);
            }
        }
    }, []);

    const t = useCallback(
        (key: string) => {
            return translations[lang][key] || translations["en"][key] || key;
        },
        [lang]
    );

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
