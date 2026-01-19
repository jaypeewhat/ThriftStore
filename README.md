# UkayUkay Thrift Shop 🛍️

A modern, aesthetic e-commerce platform for buying and selling pre-loved clothing. Built with Next.js 14, Tailwind CSS, and Supabase.

## Features ✨

### For Buyers
- Browse beautiful product listings
- Add items to cart
- Place orders
- Track order status
- View order history

### For Sellers
- Add new products with multiple images
- Manage inventory
- View sales dashboard
- Track revenue and statistics
- Edit/delete products

## Tech Stack 🚀

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS with custom gradient themes
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Image Storage**: Supabase Storage
- **State Management**: Zustand
- **Notifications**: React Hot Toast
- **Icons**: Lucide React

## Getting Started 🏁

### Prerequisites
- Node.js 18+ installed
- A Supabase account

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings > API to get your credentials
   - Run the SQL schema from `supabase-schema.sql` in the SQL Editor

3. **Create a storage bucket for product images**
   - In Supabase Dashboard, go to Storage
   - Create a new public bucket named `products`
   - Set the bucket to public access

4. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local`
   ```bash
   cp .env.local.example .env.local
   ```
   - Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Database Schema 📊

### Tables
- **profiles**: User profiles with role (buyer/seller)
- **products**: Product listings with images, pricing, and details
- **cart_items**: Shopping cart entries
- **orders**: Purchase orders with status tracking

### Image Storage Recommendation 💾

**Use Supabase Storage** for product images because:
- Seamless integration with Supabase
- Built-in CDN for fast image delivery
- Free tier includes 1GB storage
- Easy to use with Next.js Image component
- Automatic optimization and resizing
- Simple API for uploads/downloads

## Project Structure 📁

```
ukayukay/
├── app/
│   ├── auth/          # Authentication pages
│   ├── buyer/         # Buyer-specific pages
│   ├── seller/        # Seller-specific pages
│   └── page.tsx       # Home page
├── components/        # Reusable React components
├── lib/              # Utilities and configurations
│   ├── supabase.ts   # Supabase client
│   └── store.ts      # Zustand state management
└── public/           # Static assets
```

## Key Features Explained 🔑

### Authentication
- Role-based signup (buyer or seller)
- Secure authentication with Supabase Auth
- Automatic profile creation on signup

### Product Management
- Upload up to 5 images per product
- Categorize by type, size, and condition
- Real-time availability tracking

### Shopping Experience
- Beautiful product cards with hover effects
- Quick add-to-cart functionality
- Smooth checkout process
- Order tracking with status updates

### Seller Dashboard
- View sales statistics
- Manage product inventory
- Track total revenue
- Easy product editing

## Customization 🎨

The design uses a purple-pink-orange gradient theme. To customize:
- Edit colors in `tailwind.config.ts`
- Modify button styles in `app/globals.css`
- Change fonts in `app/layout.tsx`

## Deployment 🚀

### Deploy to Vercel
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Important Notes
- Remember to add your production domain to Supabase's allowed redirect URLs
- Enable email confirmations in Supabase Auth settings if needed
- Set up proper CORS policies for production

## Security 🔒

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Sellers can only modify their own products
- Secure image uploads with user-specific paths

## Support 💬

For issues or questions:
1. Check the Supabase documentation
2. Review Next.js 14 App Router docs
3. Check the code comments for inline documentation

## License 📄

MIT License - feel free to use this project for your own thrift shop!

---

Built with ❤️ using Next.js and Supabase
