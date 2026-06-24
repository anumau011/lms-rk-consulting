import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Facebook, Instagram, Linkedin, Mail, Twitter, Youtube } from "lucide-react";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import api from "../../services/api";

const socialLinks = [
  { Icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { Icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { Icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { Icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { Icon: Youtube, href: "https://youtube.com", label: "YouTube" },
];

const Footer = () => {
  const { isEducator } = useContext(AppContext);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setSubscribing(true);
    try {
      const { data } = await api.post("/api/v1/newsletter", { email });
      if (data.success) {
        toast.success(data.message || "Subscribed successfully");
        setEmail("");
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-gray-900 md:px-36 text-left w-full mt-10">
      <div className="flex flex-col md:flex-row items-start px-8 md:px-0 justify-center gap-10 md:gap-32 py-10 border-b border-white/30">
        <div className="flex flex-col md:items-start items-center w-full">
          <img src={assets.logo_dark} alt="logo" />
          <p className="mt-6 text-center md:text-left text-sm text-white/70 leading-relaxed">
            Learn anytime, anywhere with our comprehensive collection of courses. We are committed to providing an interactive learning experience that helps you build knowledge, develop skills, and advance your career.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <span className="text-sm text-white/60 mr-1">Follow us</span>
            {socialLinks.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 text-white/70 hover:bg-blue-600 hover:text-white transition-colors duration-200"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col md:items-start items-center w-full">
          <h2 className="font-semibold text-white mb-5 tracking-wide">Company</h2>
          <ul className="flex md:flex-col w-full justify-between text-sm text-white/70 md:space-y-3">
            <li>
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-colors">About us</Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors">Contact us</Link>
            </li>
            {
              isEducator && (
                <li>
                  <Link to="/educator" className="hover:text-white transition-colors">Educator</Link>
                </li>
              )
            }

          </ul>
        </div>
        <div className="hidden md:flex flex-col items-start w-full">
          <h2 className="font-semibold text-white mb-5 tracking-wide">
            Subscribe to our newsletter
          </h2>
          <p className="text-sm text-white/70">
            The latest news, articles, and resources, sent to your inbox weekly.
          </p>
          <form onSubmit={handleSubscribe} className="flex items-center gap-2 pt-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="border border-white/10 bg-white/5 text-white placeholder-white/40 outline-none focus:border-blue-500 w-64 h-10 rounded px-3 text-sm transition-colors"
            />
            <button
              type="submit"
              disabled={subscribing}
              className="bg-blue-600 hover:bg-blue-500 w-24 h-10 text-white rounded font-medium transition-colors disabled:opacity-60"
            >
              {subscribing ? "..." : "Subscribe"}
            </button>
          </form>
          <a
            href="mailto:info@rkconsulting.org.in"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white mt-5 transition-colors"
          >
            <Mail size={16} />
            info@rkconsulting.org.in
          </a>
        </div>
      </div>
      <p className="py-4 text-center text-xs md:text-sm text-white/50">
        Copyright {new Date().getFullYear()} ©{" "}
        <a
          href="https://www.rkconsulting.org.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-white transition-colors"
        >
          RK Consulting
        </a>
        . All Rights Reserved.
      </p>
    </footer>
  );
};

export default Footer;
