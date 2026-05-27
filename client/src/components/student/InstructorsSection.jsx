import React from "react";

const instructors = [
	{
		name: "William Samuel",
		image:
			"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1000&q=85",
	},
	{
		name: "Olivia Sophia",
		image:
			"https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=85",
	},
	{
		name: "Jacob Mason",
		image:
			"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1000&q=85",
	},
	{
		name: "Isabella Grace",
		image:
			"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85",
	},
];

const InstructorsSection = () => {
	return (
		<section className="py-14 px-8 md:px-40 w-full">
			<h2 className="text-3xl font-medium text-gray-800">Our Instructors</h2>
			<p className="text-sm md:text-base text-gray-500 mt-3">
				Learn from experienced instructors who guide you step by step.
			</p>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-10">
				{instructors.map((instructor) => (
					<article
						key={instructor.name}
					>
						<img
							src={instructor.image}
							alt={instructor.name}
							className="h-40 w-40 mx-auto object-cover rounded-full"
						/>
						<h3 className="mt-3 text-base font-semibold text-gray-800 text-center">
							{instructor.name}
						</h3>
					</article>
				))}
			</div>
		</section>
	);
};

export default InstructorsSection;
