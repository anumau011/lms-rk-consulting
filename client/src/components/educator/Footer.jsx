import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
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
          <p className="mt-6 text-center md:text-left text-sm text-white/80">
            Learn anytime, anywhere with our comprehensive collection of courses. We are committed to providing an interactive learning experience that helps you build knowledge, develop skills, and advance your career.
          </p>
          <div className="flex items-center gap-4 mt-6">
            {socialLinks.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-white/80 hover:text-white transition-colors"
              >
                <Icon size={20} />
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col md:items-start items-center w-full">
          <h2 className="font-semibold text-white mb-5">Company</h2>
          <ul className="flex md:flex-col w-full justify-between text-sm text-white/80 md:space-y-2">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About us</Link>
            </li>
            <li>
              <Link to="/contact">Contact us</Link>
            </li>
            {
              isEducator && (
                <li>
                  <Link to="/educator">Educator</Link>
                </li>
              )
            }

          </ul>
        </div>
        <div className="hidden md:flex flex-col items-start w-full">
          <h2 className="font-semibold text-white mb-5">
            Subscribe to our newsletter
          </h2>
          <p className="text-sm text-white/80">
            The latest news, articles, and resources, sent to your inbox weekly.
          </p>
          <form onSubmit={handleSubscribe} className="flex items-center gap-2 pt-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="border border-gray-500/30 bg-gray-800 text-gray-500 placeholder-gray-500 outline-none w-64 h-9 rounded px-2 text-sm"
            />
            <button
              type="submit"
              disabled={subscribing}
              className="bg-blue-600 w-24 h-9 text-white rounded disabled:opacity-60"
            >
              {subscribing ? "..." : "Subscribe"}
            </button>
          </form>
        </div>
      </div>
      <p className="py-4 text-center text-xs md:text-sm text-white/60">
        Copyright {new Date().getFullYear()} © RK Consulting. All Right Reserved.
      </p>
    </footer>
  );
};

export default Footer;
