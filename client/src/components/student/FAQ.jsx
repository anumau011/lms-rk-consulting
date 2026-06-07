import React, { useState } from "react";

const faqs = [
  {
    q: "How do I create an account?",
    a: "Click \"Sign Up\", provide your email, name, and password, then verify your email address.",
  },
  {
    q: "How do I enroll in a course?",
    a: "Visit the course page and click \"Enroll\" or \"Buy Now\" to join immediately.",
  },
  {
    q: "Are courses free or paid?",
    a: "Some courses are free; paid courses show price and purchase options on the course page.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept major credit/debit cards and supported online payment providers shown at checkout.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="w-full max-w-4xl mx-auto text-left py-12">
      <h2 className="text-2xl font-semibold mb-6 text-center">Frequently Asked Questions</h2>

      <div className="space-y-4">
        {faqs.map((item, idx) => (
          <div key={idx} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full px-4 py-3 flex justify-between items-center bg-white text-left"
            >
              <span className="font-medium">{item.q}</span>
              <span className="text-xl">{openIndex === idx ? "−" : "+"}</span>
            </button>
            {openIndex === idx && (
              <div className="px-4 pb-4 text-gray-700 bg-gray-50">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
