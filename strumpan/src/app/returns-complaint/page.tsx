'use client';
import { useState } from "react";
import Link from "next/link";

export default function ReturnsComplaintsPage() {
    const [complaintEmail, setComplaintEmail] = useState("");
    const [complaintDescription, setComplaintDescription] = useState("");
    const [complaintStatus, setComplaintStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [complaintError, setComplaintError] = useState("");

    const [returnEmail, setReturnEmail] = useState("");
    const [orderNumber, setOrderNumber] = useState("");
    const [returnProduct, setReturnProduct] = useState("");
    const [returnStatus, setReturnStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [returnError, setReturnError] = useState("");

    async function handleComplaint(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setComplaintStatus("submitting");
        setComplaintError("");

        try {
            /*
            await createComplaint({
                email: complaintEmail,
                description: complaintDescription,
            }); */

            setComplaintStatus("success");
            setComplaintEmail("");
            setComplaintDescription("");
        } catch (err) {
            setComplaintStatus("error");
            setComplaintError(err instanceof Error ? err.message : "Kunde inte skicka klagomålet.");
        }
    }

    async function handleReturn(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setReturnStatus("submitting");
        setReturnError("");

        try {
           /* await createReturn({
                email: returnEmail,
                orderNumber: orderNumber,
                product: returnProduct,
            }); */

            setReturnStatus("success");
            setReturnEmail("");
            setOrderNumber("");
            setReturnProduct("");
        } catch (err) {
            setReturnStatus("error");
            setReturnError(err instanceof Error ? err.message : "Kunde inte skicka returförfrågan.");
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            <Link href="/" className="mb-6 inline-block text-sm hover:underline">
                ← Tillbaka till startsidan
            </Link>

            <h1 className="text-3xl font-bold text-center mb-6 dark:text-(--text-color-headings)">Return & Complaints</h1>

            <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 dark:border-gray-800 dark:bg-foreground">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-(--text-color-subheadings)">Complaints form</h2>

                {complaintStatus === "success" && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm">
                        Tack! Ditt klagomål har skickats.
                    </div>
                )}

                {complaintStatus === "error" && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                        {complaintError}
                    </div>
                )}

                <form onSubmit={handleComplaint} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                        <input 
                            type="email" 
                            placeholder="email@example.com" 
                            value={complaintEmail}
                            onChange={(e) => setComplaintEmail(e.target.value)}
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea 
                            placeholder="Whats wrong with the product?" 
                            rows={4}
                            value={complaintDescription}
                            onChange={(e) => setComplaintDescription(e.target.value)}
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={complaintStatus === "submitting"}
                        className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition disabled:bg-gray-400"
                    >
                        {complaintStatus === "submitting" ? "Sending..." : "Send complaint"}
                    </button>
                </form>
            </div>

            {/* Returformulär */}
            <div className="bg-white dark:bg-foreground shadow-md rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-(--text-color-subheadings)">Return form</h2>

                {returnStatus === "success" && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm">
                        Tack! Din returförfrågan har skickats.
                    </div>
                )}

                {returnStatus === "error" && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                        {returnError}
                    </div>
                )}

                <form onSubmit={handleReturn} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                        <input 
                            type="email" 
                            placeholder="email@example.com" 
                            value={returnEmail}
                            onChange={(e) => setReturnEmail(e.target.value)}
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordernumber</label>
                        <input 
                            type="text" 
                            placeholder="Example #12345" 
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                        <input 
                            type="text" 
                            placeholder="Which product do you want to return?" 
                            value={returnProduct}
                            onChange={(e) => setReturnProduct(e.target.value)}
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={returnStatus === "submitting"}
                        className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition disabled:bg-gray-400"
                    >
                        {returnStatus === "submitting" ? "Sending..." : "Send return request"}
                    </button>
                </form>
            </div>
        </div>
    );
}