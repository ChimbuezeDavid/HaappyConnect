import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Profile } from './models/Profile';
import { Category } from './models/Category';
import { Availability } from './models/Availability';
import { Booking } from './models/Booking';
import { Question } from './models/Question';
import { Review } from './models/Review';
import { Transaction } from './models/Transaction';
import { Conversation } from './models/Conversation';
import { Message } from './models/Message';

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

export async function clearAndSeedCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('--- Wiping all collections (Users, Profiles, Transactions, Bookings, Messages, etc.) ---');
    await Promise.all([
      User.deleteMany({}),
      Profile.deleteMany({}),
      Category.deleteMany({}),
      Availability.deleteMany({}),
      Booking.deleteMany({}),
      Question.deleteMany({}),
      Review.deleteMany({}),
      Transaction.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({})
    ]);
    console.log('All user data and transactions cleanly wiped.');

    console.log('Seeding official platform categories...');
    const categories = await Category.insertMany(categoriesData);
    console.log(`Seeded ${categories.length} official categories.`);

    console.log('\n======================================================');
    console.log('✅ DATABASE FULLY CLEARED FOR REAL BETA TESTING');
    console.log('======================================================');
    console.log('Status:');
    console.log('- Users: 0 (No mock or hardcoded accounts)');
    console.log('- Profiles: 0');
    console.log('- Transactions: 0');
    console.log('- Bookings: 0');
    console.log('- Categories: 12 official categories active');
    console.log('Testers will test the app wholly from signup to end-to-end usage.');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Database cleanse error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  clearAndSeedCategories();
}
