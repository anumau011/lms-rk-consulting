import React, { useContext, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { NavLink } from "react-router-dom";
import { Home, PlusCircle, Book, Users, ChevronLeft, ChevronRight, FileText, MessageSquareQuote, Archive } from "lucide-react";

const Sidebar = () => {
  const { isEducator } = useContext(AppContext);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { name: "Dashboard", path: "/educator", Icon: Home },
    { name: "Add Course", path: "/educator/add-course", Icon: PlusCircle },
    { name: "My Courses", path: "/educator/my-courses", Icon: Book },
    { name: "Drafts", path: "/educator/drafts", Icon: FileText },
    { name: "Archive", path: "/educator/archive", Icon: Archive },
    { name: "Students Enrolled", path: "/educator/student-enrolled", Icon: Users },
    { name: "Testimonials", path: "/educator/testimonials", Icon: MessageSquareQuote },
  ];

  if (!isEducator) return null;

  return (
    <aside 
      className={`bg-gray-50 min-h-screen border border-gray-100 shadow-sm transition-all duration-300 ease-in-out relative ${
        isCollapsed ? 'w-16 p-2' : 'w-16 p-4 md:w-64 md:p-6'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 hidden md:flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200 z-10"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      <nav aria-label="Educator navigation" className="h-full flex flex-col justify-start gap-6">
        {/* Header */}
        <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
          <h2 className="text-lg font-semibold text-gray-900 whitespace-nowrap">Educator</h2>
          <p className="text-sm text-gray-500 mt-1 whitespace-nowrap">Manage your courses and students</p>
        </div>

        {/* Collapsed Header - Icon only */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center pt-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-lg">E</span>
            </div>
          </div>
        )}

        <div className="grid gap-2">
          {menuItems.length === 0 ? (
            <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-4 text-center">
              <p className="text-gray-600">No menu items found</p>
            </div>
          ) : (
            menuItems.map((item) => {
              const Icon = item.Icon;
              return (
                <NavLink
                  to={item.path}
                  key={item.name}
                  end={item.path === "/educator"}
                  title={isCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `group flex items-center rounded-lg transition-all duration-200 ease-in-out border border-transparent ${
                      isCollapsed 
                        ? 'justify-center px-2 py-3' 
                        : 'gap-4 md:gap-3 px-3 py-2 md:px-4 md:py-3'
                    } ${
                      isActive
                        ? "bg-white shadow-md border-gray-100"
                        : "hover:bg-white hover:shadow-sm"
                    }`
                  }
                >
                  <div className={`flex items-center justify-center text-gray-700 group-hover:text-indigo-600 transition-colors ${
                    isCollapsed ? 'w-8 h-8' : 'w-8 h-8'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className={`text-sm font-medium text-gray-900 whitespace-nowrap transition-all duration-300 ${
                    isCollapsed ? 'hidden' : 'hidden md:inline'
                  }`}>
                    {item.name}
                  </span>

                  <span className="sr-only">{item.name}</span>
                </NavLink>
              );
            })
          )}
        </div>

        {/* Footer Profile */}
        <div className="mt-auto">
          <div className={`items-center bg-white border border-gray-100 shadow-sm rounded-lg transition-all duration-300 ${
            isCollapsed 
              ? 'hidden md:flex justify-center p-2' 
              : 'hidden md:flex gap-3 p-3'
          }`}>
            {/* Avatar */}
            <div className={`rounded-full bg-gray-200 flex-shrink-0 ${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'}`} aria-hidden="true"></div>
            
            {/* Profile Info - Hidden when collapsed */}
            <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'hidden' : 'block'}`}>
              <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">You</div>
              <div className="text-xs text-gray-500 whitespace-nowrap">Educator account</div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
