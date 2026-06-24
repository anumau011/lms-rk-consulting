import React, { useEffect, useState } from "react";
import axios from "axios";
import { Globe, Linkedin, Twitter, Instagram, Facebook, Youtube } from "lucide-react";

const SOCIAL_FIELDS = [
	{ key: "website", Icon: Globe },
	{ key: "linkedin", Icon: Linkedin },
	{ key: "twitter", Icon: Twitter },
	{ key: "instagram", Icon: Instagram },
	{ key: "facebook", Icon: Facebook },
	{ key: "youtube", Icon: Youtube },
];

const InstructorsSection = () => {
	const [instructors, setInstructors] = useState([]);
	const [loading, setLoading] = useState(true);
	const backendUrl = import.meta.env.VITE_BACKEND_URL;

	useEffect(() => {
		const fetchInstructors = async () => {
			try {
				const { data } = await axios.get(
					`${backendUrl}/api/v1/educators/public`
				);
				if (data.success && data.educators.length > 0) {
					setInstructors(data.educators);
				}
			} catch {
				// Silently fail — no instructors to show
			} finally {
				setLoading(false);
			}
		};
		fetchInstructors();
	}, [backendUrl]);

	if (loading) return null;
	if (instructors.length === 0) return null;

	return (
		<section className="py-14 px-8 md:px-40 w-full">
			<h2 className="text-3xl font-medium text-gray-800">Our Instructors</h2>
			<p className="text-sm md:text-base text-gray-500 mt-3">
				Learn from experienced instructors who guide you step by step.
			</p>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-10">
				{instructors.map((instructor) => (
					<article key={instructor._id}>
						{instructor.imageUrl ? (
							<img
								src={instructor.imageUrl}
								alt={instructor.name}
								className="h-40 w-40 mx-auto object-cover rounded-full"
							/>
						) : (
							<div className="h-40 w-40 mx-auto rounded-full bg-indigo-100 flex items-center justify-center">
								<span className="text-indigo-600 font-bold text-3xl">
									{instructor.name.charAt(0).toUpperCase()}
								</span>
							</div>
						)}
						<h3 className="mt-3 text-base font-semibold text-gray-800 text-center">
							{instructor.name}
						</h3>
						{instructor.designation && (
							<p className="text-sm text-indigo-600 text-center">
								{instructor.designation}
							</p>
						)}
						{instructor.about && (
							<p className="text-xs text-gray-500 text-center mt-1 line-clamp-2">
								{instructor.about}
							</p>
						)}
						{instructor.socialLinks &&
							Object.values(instructor.socialLinks).some(Boolean) && (
								<div className="flex items-center justify-center gap-3 mt-2">
									{SOCIAL_FIELDS.filter(
										({ key }) => instructor.socialLinks[key]
									).map(({ key, Icon }) => (
										<a
											key={key}
											href={instructor.socialLinks[key]}
											target="_blank"
											rel="noopener noreferrer"
											className="text-gray-400 hover:text-indigo-600 transition"
										>
											<Icon className="w-4 h-4" />
										</a>
									))}
								</div>
							)}
					</article>
				))}
			</div>
		</section>
	);
};

export default InstructorsSection;
