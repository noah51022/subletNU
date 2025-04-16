# Allow Unauthenticated Users to View Home Page, Restrict Other Features

## Plan

1. **Update Home Page Access**
   - Remove or adjust the redirect in `HomePage.tsx` so unauthenticated users can view the home page and sublet listings.

2. **Restrict Messages Page**
   - Ensure the messages page is only accessible to authenticated users. Redirect or show a login prompt if not logged in.

3. **Restrict Sublet Creation**
   - Prevent unauthenticated users from accessing the sublet creation page. Redirect or show a login prompt if not logged in.
   - Optionally, show a call-to-action to log in or sign up if they try to access this feature.

4. **Restrict Profile Page**
   - Prevent unauthenticated users from accessing the profile page. Redirect or show a login prompt if not logged in.
   - If the profile page is visible, ensure no personal information is shown for unauthenticated users.

5. **UI Adjustments**
   - Adjust navigation and UI elements (e.g., hide or disable profile, messages, and create buttons/links for unauthenticated users, or show a login/signup prompt instead).

6. **Testing**
   - Test all flows for both authenticated and unauthenticated users to ensure correct access and user experience.
