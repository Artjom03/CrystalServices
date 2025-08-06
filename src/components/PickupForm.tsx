"use client";

import { useState } from "react";

export default function PickupForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    service: "",
    pickupDate: "",
    pickupTime: "",
    message: "",
    agreeToTerms: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch('/api/pickup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({ 
          name: "", 
          email: "", 
          phone: "", 
          address: "", 
          service: "",
          pickupDate: "",
          pickupTime: "",
          message: "", 
          agreeToTerms: false 
        });
        
        // Reset status after 3 seconds
        setTimeout(() => setSubmitStatus("idle"), 3000);
      } else {
        setSubmitStatus("error");
        alert(result.error || 'Er is een fout opgetreden bij het verzenden van het ophaalverzoek.');
      }
    } catch (error) {
      setSubmitStatus("error");
      alert('Er is een fout opgetreden bij het verzenden van het ophaalverzoek.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
      <div className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Uw naam
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder-gray-400"
            placeholder="Voer uw naam in"
          />
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            E-mailadres
          </label>
          <div className="relative">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder-gray-400"
              placeholder="voorbeeld@email.com"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              @
            </span>
          </div>
        </div>

        {/* Service Field */}
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
            Gewenste service
          </label>
          <select
            id="service"
            name="service"
            value={formData.service}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
          >
            <option value="">Selecteer een service</option>
            <option value="Strijken">Strijken</option>
            <option value="Complete service">Complete service (wassen + strijken)</option>
          </select>
        </div>

        {/* Pickup Date Field */}
        <div>
          <label htmlFor="pickupDate" className="block text-sm font-medium text-gray-700 mb-2">
            Ophaaldatum
          </label>
          <input
            type="date"
            id="pickupDate"
            name="pickupDate"
            value={formData.pickupDate}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
          />
        </div>

        {/* Pickup Time Field */}
        {/* <div>
          <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-700 mb-2">
            Voorkeurstijd voor ophaling
          </label>
          <select
            id="pickupTime"
            name="pickupTime"
            value={formData.pickupTime}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
          >
            <option value="">Selecteer een tijd</option>
            <option value="08:00 - 10:00">08:00 - 10:00</option>
            <option value="10:00 - 12:00">10:00 - 12:00</option>
            <option value="12:00 - 14:00">12:00 - 14:00</option>
            <option value="14:00 - 16:00">14:00 - 16:00</option>
            <option value="16:00 - 18:00">16:00 - 18:00</option>
          </select>
        </div> */}

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            Telefoonnummer
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder-gray-400"
            placeholder="Voer uw telefoonnummer in"
          />
        </div>

        {/* Address Field */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Vul uw adres in
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder-gray-400"
            placeholder="Straat en huisnummer, postcode en plaats"
          />
        </div>

        {/* Message Field */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Bericht
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-vertical text-gray-900 placeholder-gray-400"
            placeholder="Vermeld hier de gewenste datum en tijd voor ophalen, eventuele speciale instructies..."
          />
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="agreeToTerms"
            name="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={handleChange}
            required
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
            Ik ga akkoord met de{" "}
            <a href="/algemene-voorwaarden" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              algemene voorwaarden
            </a>{" "}
            <span className="text-red-500">*</span>
          </label>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || !formData.agreeToTerms}
            className="w-full bg-gray-800 text-white py-4 px-6 rounded-md font-semibold hover:bg-gray-900 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Indienen..." : "Indienen"}
          </button>
        </div>

        {/* Success Message */}
        {submitStatus === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Bedankt voor uw aanvraag! We nemen telefonisch contact met u op om de ophaal- en leverdata te bevestigen.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
