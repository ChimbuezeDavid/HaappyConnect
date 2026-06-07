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

    const techCat = categories.find(c => c.slug === 'tech-ai');
    const bizCat = categories.find(c => c.slug === 'business-entrepreneurship');
    const marketingCat = categories.find(c => c.slug === 'marketing-sales');
    const healthCat = categories.find(c => c.slug === 'health-wellness');

    const passwordHash = await bcrypt.hash('password123', 10);

    // Mock Expert 1
    console.log('Seeding Expert 1...');
    const user1 = new User({
      email: 'jane.espo@haappyconnect.com',
      passwordHash,
      role: 'expert',
      isOnboarded: true
    });
    await user1.save();

    const profile1 = new Profile({
      user: user1._id,
      fullName: 'Jane Espo',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop',
      headline: 'SaaS Startup Consultant & YC Alum',
      bio: 'Helping founders go from 0 to 1. Former VP of Product, raised $20M+ in venture funding. Ask me about product-market fit, raising capital, and growth hacking.',
      hourlyRate: 150,
      textQuestionPrice: 20,
      videoResponsePrice: 50,
      categories: [bizCat?._id, marketingCat?._id].filter(Boolean),
      ratingAverage: 4.8,
      reviewsCount: 37
    });
    await profile1.save();

    // Mock Expert 2
    console.log('Seeding Expert 2...');
    const user2 = new User({
      email: 'marcus.vance@haappyconnect.com',
      passwordHash,
      role: 'expert',
      isOnboarded: true
    });
    await user2.save();

    const profile2 = new Profile({
      user: user2._id,
      fullName: 'Dr. Marcus Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop',
      headline: 'Performance Dietitian & Fitness Coach',
      bio: 'Doctor of Clinical Nutrition. 12+ years training Olympic and professional athletes. Get custom dietary protocols, biohacking guidelines, and strength routines.',
      hourlyRate: 120,
      textQuestionPrice: 15,
      videoResponsePrice: 40,
      categories: [healthCat?._id].filter(Boolean),
      ratingAverage: 4.9,
      reviewsCount: 54
    });
    await profile2.save();

    // Mock Expert 3
    console.log('Seeding Expert 3...');
    const user3 = new User({
      email: 'linus.tech@haappyconnect.com',
      passwordHash,
      role: 'expert',
      isOnboarded: true
    });
    await user3.save();

    const profile3 = new Profile({
      user: user3._id,
      fullName: 'Linus Tech',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop',
      headline: 'Senior Staff Software Architect',
      bio: 'Former Principal Engineer at Google. Deep expertise in distributed systems, high-availability APIs, React Native, and scaling database performance. Ask me any technical blockers.',
      hourlyRate: 200,
      textQuestionPrice: 30,
      videoResponsePrice: 75,
      categories: [techCat?._id].filter(Boolean),
      ratingAverage: 5.0,
      reviewsCount: 112
    });
    await profile3.save();

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
