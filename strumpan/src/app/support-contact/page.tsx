"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      {/*await createTicket({
        title,
        description,
        ticketType,
      }); */}

      setStatus("success");
      setTitle("");
      setDescription("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong when trying to submit the form."
      );
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/" className="mb-6 inline-block text-sm hover:underline">
        ← Tillbaka till startsidan
      </Link>

      {status === "success" && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm">
          Tack! Ditt ärende har skickats.
        </div>
      )}

      {status === "error" && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleContact} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ticket
          </label>
          <select
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="SUPPORT">Support</option>
            <option value="CONTACT">Contact</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            placeholder="What do you need help with?"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition disabled:bg-gray-400"
        >
          {status === "submitting" ? "Sending..." : "Send"}
        </button>
      </form>

      <h2 className="font-semibold text-base text-gray-900 mb-3 pt-4">Company</h2>
      <p>
        <span className="font-medium text-gray-700">Name:</span> Company Name AB
      </p>
      <p>
        <span className="font-medium text-gray-700">Org.nr:</span> 556XXX-XXXX
      </p>
      <p>
        <span className="font-medium text-gray-700">Address:</span> placeholder
      </p>
    </div>
  );
}