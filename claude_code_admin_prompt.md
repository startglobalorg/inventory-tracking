# Admin Dashboard Enhancement Prompt for Claude Code

@claude-code Please enhance the `/admin` dashboard of the START Inventory Management System with authentication and a new view for ordering points (locations). Ensure any code you write works within the existing Next.js 16 Server Actions paradigm.

## Part 1: Admin Authentication

1. **Protect the `/admin` route**: 
   - Add a simple password authentication mechanism to protect `app/admin` and all its sub-routes.
   - The password must be securely read from an environment variable (e.g., `ADMIN_PASSWORD`).
   - **Crucial for Portainer/Docker Deployment**: Do NOT prefix the variable with `NEXT_PUBLIC_`. You must read `process.env.ADMIN_PASSWORD` within a Server Action or Next.js Middleware. Next.js bakes `NEXT_PUBLIC_` variables at build time, but we need the password to be dynamically injected at runtime via Portainer environment variables. Use `export const dynamic = 'force-dynamic';` where necessary or use runtime middleware to prevent the variable from being cached.
2. **Login Flow**:
   - Create a simple login page for `/admin`.
   - On successful login, set a secure HttpOnly cookie (e.g., `admin_token`) and redirect the user to the admin dashboard. Allow them to stay logged in.

## Part 2: Dashboard Navigation & Tabs

1. **Top Navigation**: 
   - Update `app/admin/AdminDashboard.tsx` to serve as a layout or container with a top navigation bar holding two main buttons/tabs: **"Volunteers"** (default) and **"Locations"**.
2. **Volunteers View**: 
   - Ensure the 'main view' of `/admin` lists existing volunteers exactly as it does now. We want this to remain completely unchanged in its layout and functionality (listing, open/total orders, deleting runners).

## Part 3: New Locations View (Ordering Points)

1. **Locations Overview**: 
   - Create a new view (either a conditional render in the dashboard or a nested route `app/admin/locations`) that displays all locations (`/request/X` points like coffee points, info points, speaker lounge, etc.).
   - Use the `locations` table to list them.
2. **Basic Statistics**: 
   - For each location, display basic statistics similar to the volunteers view: Total Orders and X Open Orders. (You might need to write a new action `getLocationOrderCounts` in `app/actions/volunteer-orders.ts`).
3. **Delete History Capability**: 
   - Add a clear button/action for each location to "Delete History" or "Clear Logs".
   - This should delete all past **completed** orders for that specific location (orders where `locationId` matches and `status === 'done'`). Do not delete ongoing or open orders. Implement this safely via a Server Action.

*Remember to double-check that your server actions properly handle errors and `revalidatePath` to keep the UI state in sync!*
