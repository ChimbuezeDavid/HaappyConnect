import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Profile } from './models/Profile';
import { Category } from './models/Category';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HaappyConnect';

const categoriesData = [
  { name: 'Technology & AI', slug: 'tech-ai', icon: 'code', description: 'Software engineering, AI systems, mobile development, tech stack design' },
  { name: 'Business & Entrepreneurship', slug: 'business-entrepreneurship', icon: 'briefcase', description: 'Fundraising, pitch decks, product market fit, strategy, startups' },
  { name: 'Marketing & Sales', slug: 'marketing-sales', icon: 'trending-up', description: 'SEO, digital advertising, brand identity, user acquisition, growth hacking' },
  { name: 'Finance & Investment', slug: 'finance-investment', icon: 'dollar-sign', description: 'Wealth management, investing strategies, tax structures' },
  { name: 'Health & Wellness', slug: 'health-wellness', icon: 'activity', description: 'Custom nutrition, workout planning, sleep optimization, mindfulness' },
  { name: 'Career Development', slug: 'career-development', icon: 'graduation-cap', description: 'Resume building, interview prep, salary negotiation, career pivots' },
  { name: 'Personal Development', slug: 'personal-development', icon: 'smile', description: 'Life coaching, productivity, goal setting, mindset' },
  { name: 'Legal Services', slug: 'legal', icon: 'scale', description: 'Contracts, intellectual property, corporate structuring, legal guidance' },
  { name: 'Design & Creative', slug: 'design-creative', icon: 'palette', description: 'UI/UX design, graphic design, branding, creative direction' },
  { name: 'Education & Academics', slug: 'education-academics', icon: 'book', description: 'Tutoring, college applications, academic research, test prep' },
  { name: 'Real Estate', slug: 'real-estate', icon: 'home', description: 'Property investing, buying/selling strategies, property management' },
  { name: 'Writing & Content', slug: 'writing-content', icon: 'pen-tool', description: 'Copywriting, content creation, social media content, editing' }
];

const AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=300&fit=crop'
];

const FIRST_NAMES = [
  'Jane', 'John', 'Alex', 'Emily', 'Sarah', 'Michael', 'Marcus', 'Jessica', 'David', 'Sophia',
  'Daniel', 'Olivia', 'James', 'Isabella', 'Robert', 'Mia', 'William', 'Charlotte', 'Joseph', 'Evelyn',
  'Charles', 'Amanda', 'Richard', 'Elizabeth', 'Thomas', 'Megan', 'Brian', 'Ashley', 'Matthew', 'Taylor',
  'Kevin', 'Rachel', 'Jason', 'Nicole', 'Jeffrey', 'Heather', 'Timothy', 'Melissa', 'Frank', 'Michelle',
  'Gary', 'Kimberly', 'Ryan', 'Stephanie', 'Eric', 'Donna', 'Stephen', 'Carol', 'Jacob', 'Rebecca'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

// Pre-defined expert descriptions to map across 50 indices
const EXPERT_TEMPLATES = [
  { slug: 'tech-ai', title: 'Senior iOS Developer', bio: 'Former Apple Lead, specializing in Swift, SwiftUI, and React Native architectures.' },
  { slug: 'tech-ai', title: 'AI Research Scientist', bio: 'Expert in LLM fine-tuning, retrieval-augmented generation (RAG), and vector databases.' },
  { slug: 'tech-ai', title: 'Full Stack Engineer', bio: '10 years building high-traffic web applications with Node.js, React, and MongoDB.' },
  { slug: 'tech-ai', title: 'Cybersecurity Specialist', bio: 'Certified ethical hacker. Specializing in secure APIs, cloud security, and compliance audits.' },
  { slug: 'business-entrepreneurship', title: 'Startup Founder & VC Partner', bio: 'Helped raise $40M+ in venture capital. Specializing in pitch decks and fundraising strategy.' },
  { slug: 'business-entrepreneurship', title: 'Product Management Director', bio: 'Ex-Amazon, focusing on product roadmaps, agile development, and PM workflows.' },
  { slug: 'business-entrepreneurship', title: 'Business Development Coach', bio: 'Helping SaaS startups transition from validation to repeatable sales pipelines.' },
  { slug: 'business-entrepreneurship', title: 'Agile Coach & Scrum Master', bio: 'Optimizing workflow efficiency and building high-performance collaborative teams.' },
  { slug: 'marketing-sales', title: 'Growth Marketer', bio: 'Specializing in SEO, viral loop design, customer acquisition costs, and conversion rates.' },
  { slug: 'marketing-sales', title: 'SEO Strategist', bio: 'Ranked 100+ keywords on Google page 1. Audit your site architecture and technical SEO.' },
  { slug: 'marketing-sales', title: 'Social Media Manager', bio: 'Built organic audiences of 500k+ on TikTok and LinkedIn. Let\'s optimize your brand.' },
  { slug: 'marketing-sales', title: 'B2B Sales Trainer', bio: 'Helping enterprise sales teams close bigger deals and shorten sales cycles.' },
  { slug: 'finance-investment', title: 'Certified Financial Planner', bio: 'Personal wealth management, investment planning, and tax optimization.' },
  { slug: 'finance-investment', title: 'Cryptocurrency Fund Manager', bio: 'DeFi expert, yield farming, portfolio diversification, and risk analysis.' },
  { slug: 'finance-investment', title: 'Real Estate Investment Advisor', bio: 'Analyzing commercial properties, rental margins, and tax-deferred exchanges.' },
  { slug: 'finance-investment', title: 'Retirement Planning Consultant', bio: 'Helping professionals optimize their 401(k), IRA, and early retirement plans.' },
  { slug: 'health-wellness', title: 'Holistic Health Coach', bio: 'Personalized nutrition, functional medicine, stress management, and gut health.' },
  { slug: 'health-wellness', title: 'Olympic Strength Coach', bio: 'Strength and conditioning protocols, powerlifting, and athletic performance.' },
  { slug: 'health-wellness', title: 'Clinical Dietitian', bio: 'Evidence-based meal planning, medical nutrition therapy, and diabetes management.' },
  { slug: 'health-wellness', title: 'Yoga & Meditation Instructor', bio: 'Mindfulness training, breathing exercises, and posture correction.' },
  { slug: 'career-development', title: 'Technical Recruiter', bio: 'Ex-Meta. Resume reviews, LinkedIn optimization, and mock technical interview prep.' },
  { slug: 'career-development', title: 'Executive Career Coach', bio: 'Helping mid-level managers step up to VP and C-suite roles.' },
  { slug: 'career-development', title: 'Salary Negotiation Expert', bio: 'Add $20k-$50k to your offer. Learn exactly what to say during negotiations.' },
  { slug: 'career-development', title: 'Tech Interview Mentor', bio: 'LeetCode structures, system design, and behavioral response strategies.' },
  { slug: 'personal-development', title: 'Life Coach', bio: 'Identify blind spots, set goals, improve relationships, and break limiting habits.' },
  { slug: 'personal-development', title: 'Productivity Consultant', bio: 'Notion setups, time blocking, getting things done (GTD) framework, and flow states.' },
  { slug: 'personal-development', title: 'Mindset Coach', bio: 'Overcoming imposter syndrome, building resilience, and developing growth mindsets.' },
  { slug: 'legal', title: 'IP & Trademark Attorney', bio: 'Patents, trademarks, licensing, and protecting proprietary software code.' },
  { slug: 'legal', title: 'Corporate Legal Advisor', bio: 'Entity formation, founder vesting agreements, NDAs, and fundraising contracts.' },
  { slug: 'legal', title: 'Contract Specialist', bio: 'SaaS agreements, service level agreements, and client service contracts.' },
  { slug: 'design-creative', title: 'Lead UI/UX Designer', bio: 'Design systems, Figma prototypes, user testing, and mobile app design audits.' },
  { slug: 'design-creative', title: 'Brand Identity Designer', bio: 'Logos, style guides, graphic design assets, and visual storytelling.' },
  { slug: 'design-creative', title: 'Creative Director', bio: 'Advertising design, campaign strategy, video production, and commercial art.' },
  { slug: 'design-creative', title: 'Design System Architect', bio: 'Building scalable design components in Figma and translating them to code.' },
  { slug: 'education-academics', title: 'College Admissions Consultant', bio: 'Ivy League application strategies, essay writing reviews, and interview prep.' },
  { slug: 'education-academics', title: 'Academic Researcher', bio: 'Scientific writing, data analysis, literature reviews, and grant proposals.' },
  { slug: 'education-academics', title: 'Mathematics Tutor', bio: 'Calculus, linear algebra, statistics, and SAT math preparation.' },
  { slug: 'real-estate', title: 'Commercial Property Analyst', bio: 'Evaluating multifamily assets, cap rates, and lease terms.' },
  { slug: 'real-estate', title: 'First-Time Homebuyer Coach', bio: 'Navigating mortgages, inspections, appraisals, and closing costs.' },
  { slug: 'real-estate', title: 'Airbnb Host Advisor', bio: 'Optimizing listings, pricing models, guest communication, and property management.' },
  { slug: 'writing-content', title: 'Conversion Copywriter', bio: 'Landing pages, email sequences, sales pages, and microcopy.' },
  { slug: 'writing-content', title: 'Book Editor & Coach', bio: 'Structural editing, copyediting, publishing proposals, and self-publishing setups.' },
  { slug: 'writing-content', title: 'Technical Writer', bio: 'API docs, developer guides, white papers, and system documentation.' },
  { slug: 'tech-ai', title: 'DevOps & Cloud Engineer', bio: 'AWS, Docker, Kubernetes, CI/CD pipelines, and infrastructure as code.' },
  { slug: 'business-entrepreneurship', title: 'Franchise Consultant', bio: 'Navigating franchise agreements, operations, and picking local opportunities.' },
  { slug: 'marketing-sales', title: 'Paid Ads Specialist', bio: 'Google Ads, Meta Ads, scaling budgets, and ROAS optimization.' },
  { slug: 'finance-investment', title: 'Stock Market Analyst', bio: 'Value investing, fundamental analysis, options trading, and market trends.' },
  { slug: 'health-wellness', title: 'Sleep Consultant', bio: 'Circadian rhythm alignment, sleep hygiene, and treating insomnia naturally.' },
  { slug: 'career-development', title: 'Career Pivot Mentor', bio: 'Transitioning from non-tech to tech or switching industry directions successfully.' },
  { slug: 'legal', title: 'Data Privacy Consultant', bio: 'GDPR compliance, CCPA, privacy policies, and security operations.' }
];

// Pre-defined seeker goals/interests to map across 50 indices
const SEEKER_GOALS = [
  'Seeking guidance on scaling a SaaS tech stack.',
  'Looking for career coaches to help switch from finance to software engineering.',
  'Finding a mentor to review Figma UI/UX designs and portfolio.',
  'Searching for advice on raising pre-seed venture capital.',
  'Needs mock interview prep for senior product manager roles.',
  'Researching rental yields and property investment margins.',
  'A founder seeking growth hacking and SEO optimization strategies.',
  'Searching for customized nutrition meal prep and workout schedules.',
  'Wants contract reviews for a new software developer hire.',
  'Needs calculus and statistics prep for college courses.',
  'Looking for a copywriting editor to audit landing page drafts.',
  'Needs advice on patent filing and software IP licensing.',
  'Researching DeFi portfolio structures and yield farming.',
  'Needs help setting up a Notion workspace and productivity filters.',
  'Wants tips on salary negotiation for a new tech offer.',
  'Looking for B2B enterprise sales tactics and pipeline advice.',
  'Seeking a life coach to break procrastination patterns.',
  'Needs help drafting founders agreements and equity vesting rules.',
  'Researching how to set up an Airbnb hosting checklist.',
  'Wants sleep hygiene advice to combat chronic insomnia.',
  'Seeking a tech pivot mentor for changing industries.',
  'Needs assistance with scientific paper review and data research.',
  'Wants brand identity feedback for a new clothing line.',
  'Looking for an expert to advise on corporate GDPR compliance.',
  'Needs advice on structuring a stock market value portfolio.'
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // Clear existing data
    console.log('Clearing old categories, profiles, and users...');
    await Category.deleteMany({});
    await Profile.deleteMany({});
    await User.deleteMany({});

    // Seed Categories
    console.log('Seeding categories...');
    const categories = await Category.insertMany(categoriesData);
    console.log(`Seeded ${categories.length} categories.`);

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Seed 50 Experts
    console.log('Seeding 50 diverse experts...');
    for (let i = 0; i < 50; i++) {
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(i + 15) % LAST_NAMES.length];
      const fullName = `${firstName} ${lastName}`;
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}`;
      const email = `expert.${i}@haappyconnect.com`;

      const user = new User({
        email,
        passwordHash,
        role: 'expert',
        isOnboarded: true
      });
      await user.save();

      // Retrieve matching category ID
      const template = EXPERT_TEMPLATES[i];
      const categoryObj = categories.find(c => c.slug === template.slug);
      
      // Calculate random prices
      const hourlyRate = Math.floor(Math.random() * 150) + 70; // 70 to 220
      const textQuestionPrice = Math.floor(hourlyRate * 0.15) + 5; // 15 to 38
      const videoResponsePrice = Math.floor(hourlyRate * 0.35) + 10; // 34 to 87
      const reviewsCount = Math.floor(Math.random() * 80) + 5; // 5 to 85
      const ratingAverage = Number((Math.random() * 0.8 + 4.2).toFixed(1)); // 4.2 to 5.0

      const profile = new Profile({
        user: user._id,
        fullName,
        username,
        avatarUrl: AVATARS[i % AVATARS.length],
        headline: template.title,
        bio: template.bio,
        hourlyRate,
        textQuestionPrice,
        videoResponsePrice,
        categories: categoryObj ? [categoryObj._id] : [],
        ratingAverage,
        reviewsCount,
        visibility: 'Public',
        location: `${['San Francisco', 'New York', 'London', 'Berlin', 'Austin', 'Lagos'][i % 6]}, ${['USA', 'UK', 'Germany', 'Nigeria'][i % 4]}`
      });
      await profile.save();
    }
    console.log('Seeded 50 experts.');

    // 2. Seed 50 Seekers
    console.log('Seeding 50 diverse seekers...');
    for (let i = 0; i < 50; i++) {
      const firstName = FIRST_NAMES[(i + 25) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(i + 35) % LAST_NAMES.length];
      const fullName = `${firstName} ${lastName}`;
      const username = `seeker.${firstName.toLowerCase()}.${i}`;
      const email = `seeker.${i}@haappyconnect.com`;

      const user = new User({
        email,
        passwordHash,
        role: 'seeker',
        isOnboarded: true
      });
      await user.save();

      const goal = SEEKER_GOALS[i % SEEKER_GOALS.length];

      const profile = new Profile({
        user: user._id,
        fullName,
        username,
        avatarUrl: AVATARS[(i + 10) % AVATARS.length],
        bio: goal,
        headline: 'Aspirant Advice Seeker',
        hourlyRate: 0,
        textQuestionPrice: 0,
        videoResponsePrice: 0,
        categories: [],
        ratingAverage: 0,
        reviewsCount: 0,
        visibility: 'Public',
        location: `${['Chicago', 'Los Angeles', 'Toronto', 'Sydney', 'Paris', 'Nairobi'][i % 6]}, ${['USA', 'Canada', 'Australia', 'France', 'Kenya'][i % 5]}`
      });
      await profile.save();
    }
    console.log('Seeded 50 seekers.');

    console.log('Database seeded successfully with 100 diverse profiles!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
