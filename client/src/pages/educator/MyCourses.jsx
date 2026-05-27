import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  Edit3, EyeOff, MoreVertical, Users, DollarSign,
  Calendar, TrendingUp, Search, Plus, Globe,
  Trash2, Copy, BarChart3
} from "lucide-react";

const MyCourses = () => {
  const { currency, backendUrl, isEducator, getToken } = useContext(AppContext);

  const [courses, setCourses] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const fetchEducatorCourses = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(backendUrl + "/api/v1/courses/instructor?status=published", {
        headers: { Authorization: `Bearer ${token}` },
      });

      data.success && setCourses(data.courses);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleArchive = async (courseId) => {
    try {
      if (!window.confirm("Are you sure you want to archive this course?")) return;

      const token = await getToken();
      const { data } = await axios.delete(
        backendUrl + `/api/v1/courses/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Course archived successfully");
        fetchEducatorCourses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
    setOpenDropdown(null);
  };

  const handleUnpublish = async (courseId) => {
    try {
      if (!window.confirm("Are you sure you want to unpublish this course? It will move to drafts.")) return;

      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + `/api/v1/courses/${courseId}/unpublish`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success("Course unpublished successfully");
        fetchEducatorCourses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
    setOpenDropdown(null);
  };

  useEffect(() => {
    if (isEducator) {
      fetchEducatorCourses();
    }
  }, [isEducator]);

  // Close dropdown on scroll
  useEffect(() => {
    const handleScroll = () => setOpenDropdown(null);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  const handleDropdownToggle = (e, courseId) => {
    if (openDropdown === courseId) {
      setOpenDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setOpenDropdown(courseId);
  };

  const getCoursePricing = (course) => {
    const tiers = course.pricingTiers || [];
    const basicTier = tiers.find((t) => t.tier === "basic");
    const goldTier = tiers.find((t) => t.tier === "gold" || t.tier === "standard");
    const platinumTier = tiers.find((t) => t.tier === "platinum" || t.tier === "premium");

    const calculateFinalPrice = (price, discount) => {
      if (!price || !discount) return price;
      return price - (price * discount / 100);
    };

    const pack = (t) => ({
      price: t?.price || 0,
      finalPrice: calculateFinalPrice(t?.price || 0, t?.discount || 0),
      discount: t?.discount || 0,
      exists: !!t,
    });

    return {
      basic: pack(basicTier),
      gold: pack(goldTier),
      platinum: pack(platinumTier),
    };
  };

  const tierEnrollmentCounts = (course) => {
    const e = course.enrollmentsByTier || {};
    return {
      basic: e.basic || 0,
      gold: (e.gold || 0) + (e.standard || 0),
      platinum: (e.platinum || 0) + (e.premium || 0),
    };
  };

  const filteredCourses = courses?.filter(course => {
    return course.title?.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalEarnings = courses?.reduce((acc, course) => {
    const pricing = getCoursePricing(course);
    const c = tierEnrollmentCounts(course);
    return (
      acc +
      c.basic * pricing.basic.finalPrice +
      c.gold * pricing.gold.finalPrice +
      c.platinum * pricing.platinum.finalPrice
    );
  }, 0) || 0;

  const totalStudents = courses?.reduce((acc, course) => {
    const c = tierEnrollmentCounts(course);
    if (typeof course.enrollmentCount === "number") return acc + course.enrollmentCount;
    return acc + c.basic + c.gold + c.platinum;
  }, 0) || 0;

  return courses ? (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Courses</h1>
            <p className="text-gray-500 mt-1">Manage your published courses</p>
          </div>
          <Link
            to="/educator/add-course"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-medium"
          >
            <Plus size={20} />
            Create New Course
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{courses.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalStudents}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Avg. per Course</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{courses.length > 0
                    ? (totalEarnings / courses.length).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search published courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        {/* Courses List */}
        {filteredCourses && filteredCourses.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gold</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Platinum</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Stats</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCourses.map((course) => {
                    const pricing = getCoursePricing(course);
                    const ec = tierEnrollmentCounts(course);

                    const basicEarnings = ec.basic * pricing.basic.finalPrice;
                    const goldEarnings = ec.gold * pricing.gold.finalPrice;
                    const platinumEarnings = ec.platinum * pricing.platinum.finalPrice;
                    const courseTotalEarnings = basicEarnings + goldEarnings + platinumEarnings;
                    const totalEnrollments = ec.basic + ec.gold + ec.platinum;

                    const TierCell = ({ tierKey, count, earnings, accentClass }) =>
                      pricing[tierKey].exists ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${accentClass}`}>
                              ₹{pricing[tierKey].finalPrice.toLocaleString("en-IN")}
                            </span>
                            {pricing[tierKey].discount > 0 && (
                              <span className="text-xs text-gray-400 line-through">
                                ₹{pricing[tierKey].price.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Users size={12} />
                            <span className="font-medium">{count}</span> students
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            Earned: ₹{earnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      );

                    return (
                      <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-20 h-12 object-cover rounded-lg bg-gray-100"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-xs">{course.title}</p>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 mt-1">
                                <Globe size={10} />
                                Published
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <TierCell
                            tierKey="basic"
                            count={ec.basic}
                            earnings={basicEarnings}
                            accentClass="text-slate-800"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <TierCell
                            tierKey="gold"
                            count={ec.gold}
                            earnings={goldEarnings}
                            accentClass="text-amber-700"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <TierCell
                            tierKey="platinum"
                            count={ec.platinum}
                            earnings={platinumEarnings}
                            accentClass="text-cyan-800"
                          />
                        </td>

                        {/* Total Stats */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-900">
                              <Users size={14} className="text-gray-400" />
                              <span className="font-semibold">{totalEnrollments}</span>
                              <span className="text-sm text-gray-500">total</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign size={14} className="text-green-600" />
                              <span className="font-bold text-green-600">
                                ₹{courseTotalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-500 text-sm">
                          {new Date(course.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/educator/edit-course/${course._id}`}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit course"
                            >
                              <Edit3 size={18} />
                            </Link>

                            <button
                              onClick={(e) => handleDropdownToggle(e, course._id)}
                              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No published courses found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? "Try adjusting your search"
                : "Your published courses will appear here"}
            </p>
            {!searchTerm && (
              <Link
                to="/educator/add-course"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-medium"
              >
                <Plus size={20} />
                Create New Course
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Fixed Dropdown Portal — renders outside table so it's never clipped */}
      {openDropdown && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenDropdown(null)}
          />
          {/* Dropdown menu */}
          <div
            className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
          >
            <button
              onClick={() => handleUnpublish(openDropdown)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <EyeOff size={14} />
              Unpublish
            </button>
            <hr className="my-2 border-gray-100" />
            <button
              onClick={() => handleArchive(openDropdown)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 size={14} />
              Archive Course
            </button>
          </div>
        </>
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default MyCourses;