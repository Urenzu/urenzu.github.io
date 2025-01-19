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
      <div className="fixed inset-0 bg-black/80 z-10" />

      {/* Main content wrapper */}
      <div className="relative z-20 min-h-screen text-white">
        {/* Header Section with Profile and Intent */}
        <div className="w-full px-4 py-8">
          <div className="max-w-7xl mx-auto flex gap-8 items-start">
            {/* Left Side - Profile */}
            <div className="w-64 flex flex-col items-center">
              {/* Profile Picture Container */}
              <div className="w-40 h-40 rounded-full overflow-hidden mb-6 border-2 border-white/80 shadow-lg relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
                <img
                  src="/pfp.png"
                  alt="Profile"
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                />
              </div>
              {/* Name */}
              <h1 className="text-3xl font-serif mb-4 text-center">Levi Rankin</h1>

              {/* Social Icons */}
              <div className="flex flex-col space-y-4 items-center">
                <a href="https://github.com/Urenzu" className="hover:text-gray-300 transition-colors p-2 flex items-center gap-2">
                  <Github size={24} />
                  <span className="text-sm">GitHub</span>
                </a>
                <a 
                  href="/resume.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-gray-300 transition-colors p-2 flex items-center gap-2"
                >
                  <FileText size={24} />
                  <span className="text-sm">Resume</span>
                </a>
                <a href="https://www.linkedin.com/in/levirankin/" className="hover:text-gray-300 transition-colors p-2 flex items-center gap-2">
                  <Linkedin size={24} />
                  <span className="text-sm">LinkedIn</span>
                </a>
              </div>
            </div>

            {/* Right Side - Intent and Interests */}
            <div className="flex-1 space-y-4">
              {/* Intent Card */}
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h2 className="text-xl font-serif mb-4">Intent</h2>
                <div className="text-gray-200 text-base space-y-4">
                  <p>
                    My previous experiences span diverse domains, including artificial intelligence and data science; 
                    however, I am currently hyper-focused on distributed and real-time systems. This includes exploring scalable architectures, 
                    fault-tolerant designs, efficient communication mechanisms for high-performance applications, and advanced protocols.  
                    
                  </p>
                </div>
              </div>
              
              {/* Interests Card */}
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h2 className="text-xl font-serif mb-4">Current Interests / Focus</h2>
                <div className="text-gray-200 text-base flex flex-wrap gap-3 justify-center">
                  <span className="bg-white/10 px-3 py-1 rounded-full">C++</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full">Distributed Systems</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full">ML</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full">Finance</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full">Fundamentals</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="max-w-7xl mx-auto px-4 space-y-12 pb-16">

        {/* New Work Experience Section */}
        <Section title="Work Experience">
            <div className="space-y-6">
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h3 className="text-xl font-serif mb-2">Software Engineer</h3>
                <p className="text-gray-300 text-sm mb-4">UXLY Software · Internship · Sep 2024 - Dec 2024 · San Francisco, CA</p>
                <p className="text-gray-200">Building blockchain analytics software for chain integrity and analysis.</p>
              </div>

              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h3 className="text-xl font-serif mb-2">Tech Lead / Founder</h3>
                <p className="text-gray-300 text-sm mb-4">Synthura · Self-employed · Mar 2024 - Jun 2024 · Santa Cruz, CA</p>
                <p className="text-gray-200">A computer vision-focused security platform.</p>
              </div>

              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h3 className="text-xl font-serif mb-2">Undergraduate Researcher</h3>
                <p className="text-gray-300 text-sm mb-4">Baskin Engineering at UCSC · Jan 2024 - Jun 2024 · Santa Cruz, CA</p>
                <p className="text-gray-200">Research on Computer Vision with Detection Transformers.</p>
              </div>
            </div>
          </Section>


          <Section title="Projects">
            <div className="space-y-8">
              {/* Recent Projects */}
              <div className="space-y-6">
                <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-serif mb-4">Recent Projects</h3>
                  <div className="text-gray-200 text-base leading-relaxed">
                    ...
                  </div>
                </div>
              </div>

              {/* Past Projects Grid */}
              <div className="mt-8">
                <h3 className="text-xl font-serif mb-6">Past Projects</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* AI/ML Section */}
                  <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                    <h4 className="text-lg font-serif mb-4">AI & ML</h4>
                    <div className="text-gray-200 text-base space-y-2">
                      <p>Human Segmentation and Portrait Enhancement</p>
                      <p>Autonomous Driving Steering Control</p>
                      <p>Multiclassification Image Classifier</p>
                      <p>Real-time Face Detection and Tracking System</p>
                    </div>
                  </div>

                  {/* Data Science Section */}
                  <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                    <h4 className="text-lg font-serif mb-4">Data Science</h4>
                    <div className="text-gray-200 text-base space-y-2">
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
                  <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                    <h4 className="text-lg font-serif mb-4">Quantitative Developer</h4>
                    <div className="text-gray-200 text-base space-y-2">
                      <p>Crypto Data Extraction</p>
                      <p>Securities Analysis Tool</p>
                      <p>Statistical Arbitrage Pair Trading Strategy</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Education">
            <h2 className="text-xl font-serif mb-6">B.S. Computer Science</h2>
          </Section>

          <Section title="Coursework">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI & ML Track */}
                <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-serif mb-4">Artificial Intelligence</h3>
                  <div className="grid grid-cols-2 gap-4 text-gray-200 text-base">
                    <p>Machine Learning</p>
                    <p>Deep Learning</p>
                    <p>Computer Vision</p>
                    <p>Natural Language Processing</p>
                    <p>Game AI</p>
                  </div>
                </div>

                {/* Core CS */}
                <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-serif mb-4">Core Computer Science</h3>
                  <div className="grid grid-cols-2 gap-4 text-gray-200 text-base">
                    <p>Analysis of Algorithms</p>
                    <p>Data Structures & Algorithms</p>
                    <p>Programming Languages</p>
                    <p>Computational Models</p>
                    <p>Assembly</p>
                  </div>
                </div>

                {/* Systems */}
                <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-serif mb-4">Systems Engineering</h3>
                  <div className="grid grid-cols-2 gap-4 text-gray-200 text-base">
                    <p>Distributed Systems</p>
                    <p>Computer Architecture</p>
                    <p>Software Engineering I-II</p>
                    <p>Computer Systems Design</p>
                  </div>
                </div>

                {/* Mathematics */}
                <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                  <h3 className="text-xl font-serif mb-4">Mathematics</h3>
                  <div className="grid grid-cols-2 gap-4 text-gray-200 text-base">
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
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-4 text-gray-200 text-base">
                <p>Operating Systems</p>
                <p>Networking</p>
                <p>Databases</p>
              </div>
            </div>
          </Section>

          <Section title="Skills">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Programming Languages */}
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h3 className="text-xl font-serif mb-4">Programming Languages</h3>
                <div className="grid grid-cols-2 gap-4 text-gray-200 text-base">
                  <p>C++</p>
                  <p>Python</p>
                  <p>SQL</p>
                  <p>JavaScript</p>
                  <p>TypeScript</p>
                  <p>Haskell</p>
                </div>
              </div>

              {/* Cloud & DevOps */}
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h3 className="text-xl font-serif mb-4">Cloud & DevOps</h3>
                <div className="grid grid-cols-2 gap-4 text-gray-200 text-base">
                  <p>AWS</p>
                  <p>GCP</p>
                  <p>Git</p>
                  <p>Docker</p>
                  <p>Kubernetes</p>
                </div>
              </div>

              {/* AI & ML Tools */}
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h3 className="text-xl font-serif mb-4">AI & ML Tools</h3>
                <div className="grid grid-cols-2 gap-4 text-gray-200 text-base">
                  <p>PyTorch</p>
                  <p>Keras</p>
                  <p>OpenCV</p>
                  <p>Scikit-learn</p>
                  <p>Matplotlib</p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Online Certifications">
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
              <div className="text-gray-200 text-base space-y-2">
                <p>DeepLearning.ai TensorFlow Developer Specialization</p>
                <p>DeepLearning.ai Deep Learning Specialization</p>
                <p>DeepLearning.ai Machine Learning Specialization</p>
                <p>Yale University Financial Markets (Honors)</p>
                <p>The Hong Kong University of Science and Technology Python and Statistics for Financial Analysis</p>
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
  <div className="bg-black/40 p-6 rounded-xl backdrop-blur-sm">
    <h2 className="text-lg uppercase tracking-widest font-light mb-8 border-b border-white/10 pb-2">{title}</h2>
    {children}
  </div>
);

export default PersonalWebsite;