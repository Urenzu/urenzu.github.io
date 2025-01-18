import React from 'react';
import { Github, FileText, Linkedin } from 'lucide-react';

const PersonalWebsite = () => {
  return (
    <div className="min-h-screen relative">
      {/* Background image with overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: `url('/background.png')`
        }}
      />
      <div className="fixed inset-0 bg-black/80 z-10" /> {/* Slightly darker overlay for better contrast */}

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center pt-12 pb-16 text-white">
        {/* Profile Picture */}
        <div className="w-48 h-48 rounded-full overflow-hidden mb-8 border-4 border-white shadow-lg">
          <img
            src="/pfp.png"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Name */}
        <h1 className="text-4xl font-serif mb-4">Levi Rankin</h1>

        {/* Social Icons */}
        <div className="flex space-x-8 mb-16">
          <a href="https://github.com/Urenzu" className="hover:text-gray-300 transition-colors p-2">
            <Github size={28} />
          </a>
          <a 
            href="/resume.pdf" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-gray-300 transition-colors p-2"
          >
            <FileText size={28} />
          </a>
          <a href="https://www.linkedin.com/in/levirankin/" className="hover:text-gray-300 transition-colors p-2">
            <Linkedin size={28} />
          </a>
        </div>

        {/* Content Sections */}
        <div className="max-w-6xl w-full px-6 space-y-16">

          <Section title="Work">
            <p className="text-lg leading-relaxed">...</p>
          </Section>

          <Section title="Projects">
            <div className="space-y-12">
              {/* Recent Projects */}
              <div className="space-y-8">
                <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
                  <h3 className="text-2xl font-serif mb-6">Recent Projects</h3>
                  <div className="text-gray-200 text-lg leading-relaxed">
                    ...
                    {/*<span className="mx-3">•</span>*/}
                  </div>
                </div>
              </div>

              {/* Past Projects Grid */}
              <div className="mt-12">
                <h3 className="text-2xl font-serif mb-8">Past Projects</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* AI/ML Section */}
                  <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
                    <h4 className="text-xl font-serif mb-6">AI & ML</h4>
                    <div className="text-gray-200 text-lg leading-relaxed space-y-3">
                      <p>Human Segmentation and Portrait Enhancement</p>
                      <p>Autonomous Driving Steering Control</p>
                      <p>Multiclassification Image Classifier</p>
                      <p>Real-time Face Detection and Tracking System</p>
                    </div>
                  </div>

                  {/* Data Science Section */}
                  <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
                    <h4 className="text-xl font-serif mb-6">Data Science</h4>
                    <div className="text-gray-200 text-lg leading-relaxed space-y-3">
                      <p>Covid Data Analysis</p>
                      <p>Movie Industry Analysis</p>
                      <p>Sales Data Analysis</p>
                      <p>Rollercoaster Data Analysis</p>
                      <p>Singapore Property Analysis</p>
                      <p>Housing Data Cleaning</p>
                      <p>Energy Forecasting with XGBoost</p>
                    </div>
                  </div>

                  {/* Quantitative Developer Section */}
                  <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
                    <h4 className="text-xl font-serif mb-6">Quantitative Developer</h4>
                    <div className="text-gray-200 text-lg leading-relaxed space-y-3">
                      <p>Crypto Data Extraction</p>
                      <p>Securities Analysis Tool</p>
                      <p>Statistical Arbitrage Pair Trading Strategy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Academic Background">
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AI & ML Track */}
                <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
                  <h3 className="text-2xl font-serif mb-6">Artificial Intelligence</h3>
                  <div className="text-gray-200 text-lg leading-relaxed space-y-3">
                    <p>Machine Learning</p>
                    <p>Deep Learning</p>
                    <p>Computer Vision</p>
                    <p>Natural Language Processing</p>
                    <p>Game AI</p>
                  </div>
                </div>

                {/* Core CS */}
                <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
                  <h3 className="text-2xl font-serif mb-6">Core Computer Science</h3>
                  <div className="text-gray-200 text-lg leading-relaxed space-y-3">
                    <p>Analysis of Algorithms</p>
                    <p>Data Structures & Algorithms</p>
                    <p>Programming Languages</p>
                    <p>Computational Models</p>
                    <p>Assembly</p>
                  </div>
                </div>

                {/* Systems */}
                <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
                  <h3 className="text-2xl font-serif mb-6">Systems Engineering</h3>
                  <div className="text-gray-200 text-lg leading-relaxed space-y-3">
                    <p>Distributed Systems</p>
                    <p>Computer Architecture</p>
                    <p>Software Engineering I-II</p>
                    <p>Computer Systems Design</p>
                  </div>
                </div>

                {/* Mathematics */}
                <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
                  <h3 className="text-2xl font-serif mb-6">Mathematics</h3>
                  <div className="text-gray-200 text-lg leading-relaxed space-y-3">
                    <p>Calculus I-III</p>
                    <p>Probability Theory</p>
                    <p>Discrete Mathematics</p>
                    <p>Linear Algebra</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Additional Studies">
            <div className="bg-white/10 p-8 rounded-xl backdrop-blur-sm">
              <div className="text-gray-200 text-lg leading-relaxed space-y-3">
                <p>Operating Systems</p>
                <p>Networking</p>
                <p>Databases</p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

// Helper component for sections
const Section = ({ title, children }) => (
  <div className="bg-black/40 p-8 rounded-xl backdrop-blur-sm">
    <h2 className="text-3xl font-serif mb-8">{title}</h2>
    {children}
  </div>
);

export default PersonalWebsite;