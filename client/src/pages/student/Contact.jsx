import React, { useState } from "react";
import axios from "axios";
import Footer from "../../components/student/Footer";
import toast from "react-hot-toast";

const Contact = () => {
    const [form, setForm] = useState({
        name: "",
        email: "",
        message: "",
    });
    const [loading, setLoading] = useState(false);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name || !form.email || !form.message) {
            toast.error("Please fill all fields ❗");
            return;
        }

        setLoading(true);

        const submitPromise = axios
            .post(`${backendUrl}/api/v1/contact`, form)
            .then(({ data }) => {
                if (!data.success) {
                    throw new Error("Something went wrong ❌");
                }
                setForm({ name: "", email: "", message: "" });
            });

        toast
            .promise(submitPromise, {
                loading: "Sending message...",
                success: "Message sent successfully 📩",
                error: (err) => err.message || "Network error ⚠",
            })
            .finally(() => setLoading(false));
    };

    return (
        <>
            <div className="w-full bg-gradient-to-b from-cyan-100/70 to-white">
                <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-20">

                    {/* HEADER */}
                    <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                            Contact Us
                        </h1>
                        <p className="mt-4 text-gray-600 text-lg">
                            Have questions or need help? We're here to support you.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">

                        {/* FORM */}
                        <form
                            onSubmit={handleSubmit}
                            className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-gray-100 space-y-6"
                        >
                            <div>
                                <label className="block text-gray-700 mb-2 font-medium">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Your name"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 mb-2 font-medium">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="Your email"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 mb-2 font-medium">
                                    Message
                                </label>
                                <textarea
                                    rows="5"
                                    name="message"
                                    value={form.message}
                                    onChange={handleChange}
                                    placeholder="Write your message..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3.5 rounded-lg font-semibold text-white transition-all
                  ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                            >
                                {loading ? "Sending..." : "Send Message"}
                            </button>
                        </form>

                        {/* CONTACT INFO */}
                        <div className="space-y-8 lg:pl-8">
                            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">
                                Get in Touch
                            </h2>

                            <p className="text-gray-600 leading-relaxed text-lg">
                                Reach out to us for any queries related to courses, enrollment,
                                or technical support. Our team usually responds within 24 hours.
                            </p>

                            <div className="space-y-5 text-gray-600">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">📍</span>
                                    <div>
                                        <span className="font-medium text-gray-800">Address:</span><br />
                                        KW Delhi-6, Raj Nagar Extension, Ghaziabad<br />
                                        Uttar Pradesh, 201003
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📞</span>
                                    <p><span className="font-medium text-gray-800">Phone:</span> +91 80062 62813</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📧</span>
                                    <p><span className="font-medium text-gray-800">Email:</span> info@rkconsulting.org.in</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">⏰</span>
                                    <p><span className="font-medium text-gray-800">Support Hours:</span> Mon - Fri: 9:00 AM — 6:00 PM IST</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <Footer />
        </>
    );
};

export default Contact;



