import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";
import { Users, BookOpen, DollarSign, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { currency, backendUrl, getToken, isEducator } = useContext(AppContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const { data } = await axios.get(backendUrl + "/api/v1/courses/instructor", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const totalCourses = data.courses.length;

        let totalEnrollments = 0;
        let totalEarnings = 0;
        const enrolledStudentsData = [];

        data.courses.forEach((course) => {
          const e = course.enrollmentsByTier || {};
          const basicCount = e.basic || 0;
          const goldCount = (e.gold || 0) + (e.standard || 0);
          const platinumCount = (e.platinum || 0) + (e.premium || 0);

          totalEnrollments += basicCount + goldCount + platinumCount;

          const tiers = course.pricingTiers || [];
          const basicTier = tiers.find((t) => t.tier === "basic");
          const goldTier = tiers.find((t) => t.tier === "gold" || t.tier === "standard");
          const platinumTier = tiers.find((t) => t.tier === "platinum" || t.tier === "premium");

          const calculateFinalPrice = (price, discount) => {
            if (!price) return 0;
            if (!discount) return price;
            return price - (price * discount) / 100;
          };

          const basicPrice = calculateFinalPrice(basicTier?.price || 0, basicTier?.discount || 0);
          const goldPrice = calculateFinalPrice(goldTier?.price || 0, goldTier?.discount || 0);
          const platinumPrice = calculateFinalPrice(platinumTier?.price || 0, platinumTier?.discount || 0);

          totalEarnings +=
            basicCount * basicPrice + goldCount * goldPrice + platinumCount * platinumPrice;
        });

        setDashboardData({
          totalCourses,
          totalEnrollments,
          totalEarnings: totalEarnings.toFixed(2),
          enrolledStudentsData: data.enrolledStudentsData?.slice(0, 10) || [],
        });
      } else {
        setError(data.message || "Failed to load dashboard");
        toast.error(data.message);
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEducator) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isEducator]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-500 text-lg font-medium mb-4">
            Failed to load dashboard
          </p>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data / not educator
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            No dashboard data available
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Create your first course to see your stats here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Educator Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Overview of your courses and student performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={<Users className="w-6 h-6 text-blue-600" />}
            value={dashboardData.totalEnrollments}
            label="Total Enrollments"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6 text-indigo-600" />}
            value={dashboardData.totalCourses}
            label="Active Courses"
            bgColor="bg-indigo-50"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6 text-green-600" />}
            value={`₹${parseFloat(dashboardData.totalEarnings).toLocaleString(
              "en-IN",
              { minimumFractionDigits: 2 }
            )}`}
            label="Total Earnings"
            bgColor="bg-green-50"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Latest Enrollments
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium hidden sm:table-cell w-16">
                    #
                  </th>
                  <th className="px-6 py-4 font-medium">Student</th>
                  <th className="px-6 py-4 font-medium">Course Title</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboardData.enrolledStudentsData.length > 0 ? (
                  dashboardData.enrolledStudentsData.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors duration-150 group"
                    >
                      <td className="px-6 py-4 text-gray-400 text-sm hidden sm:table-cell group-hover:text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.student.imageUrl}
                            alt={item.student.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {item.student.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.plan} Plan
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {item.courseTitle}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.plan === "Premium"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {item.plan}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      No enrollments found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, value, label, bgColor }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-lg ${bgColor}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  </div>
);

export default Dashboard;