'use client';
import Link from "next/link";


export default function ReturnsComplaintsPage() {
    function handleReturn(event: React.FormEvent) {
        event.preventDefault();
        // Hantera return-logik här
    }

    function handleComplaint(event: React.FormEvent) {
        event.preventDefault();
        // Hantera complaint-logik här
    }

    return (
        
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            <Link href="/" className="mb-6 inline-block text-sm hover:underline">
        ← Tillbaka till startsidan
      </Link>

            <h1 className="text-3xl font-bold text-center mb-6">Return & Complaints</h1>

            <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Complaints form</h2>
                <form onSubmit={handleComplaint} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <input 
                            type="email" 
                            placeholder="email@example.com" 
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea 
                            placeholder="Whats wrong with the product?" 
                            rows={4}
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition"
                    >
                        Send complaint
                    </button>
                </form>
            </div>

            {/* Kort för Returformulär */}
            <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Return form</h2>
                <form onSubmit={handleReturn} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                        <input 
                            type="email" 
                            placeholder="email@example.com" 
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ordernumber</label>
                        <input 
                            type="text" 
                            placeholder="Example #12345" 
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                        <input 
                            type="text" 
                            placeholder="Which product do you want to return?" 
                            required 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition"
                    >
                        Send return request
                    </button>
                </form>
            </div>
        </div>
    );
}