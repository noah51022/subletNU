# Plan to Improve Mobile Responsiveness

1. **Audit Current Responsiveness**
   - Review the site on various mobile devices and screen sizes.
   - Identify specific areas/components that do not display or function well on mobile.
   - Take screenshots and notes for reference.

2. **Increase Max Width for Mobile**
   - Adjust global and container styles to ensure the app uses the full width of the phone screen.
   - Remove or reduce unnecessary padding/margins that limit usable width on mobile.
   - Test on multiple devices to confirm changes.

3. **Improve Sublet Listing Card Layout**
   - Analyze the current card layout and spacing.
   - Redesign the card for better use of space: consider stacking elements, reducing whitespace, and making key info more prominent.
   - Rearrange UI elements if needed for clarity and usability (e.g., move price, tags, and actions for better flow).
   - Ensure touch targets are large and accessible.

4. **Update CSS for Mobile**
   - Implement or improve CSS media queries for common breakpoints (e.g., 320px, 375px, 425px, 768px).
   - Ensure layouts use relative units (%, rem, em, vw, vh) instead of fixed px where appropriate.
   - Adjust padding, margins, and font sizes for readability and usability on small screens.

5. **Test and Refactor Components**
   - Refactor UI components to be flexible and stack vertically on small screens.
   - Ensure images and media are responsive (use max-width: 100%, height: auto).
   - Make buttons and touch targets large enough for easy tapping.

6. **Navigation Improvements**
   - Implement a mobile-friendly navigation menu (hamburger menu, bottom nav, etc.).
   - Ensure navigation is easily accessible and usable on all screen sizes.

7. **Performance Optimization**
   - Optimize images and assets for faster loading on mobile networks.
   - Minimize use of large libraries or unnecessary scripts.

8. **Testing**
   - Test the site on real devices and emulators for various OS/browsers.
   - Use browser dev tools to simulate different screen sizes and network conditions.
   - Gather feedback from users if possible.

9. **Iterate and Document**
   - Address any issues found during testing.
   - Document changes and best practices for future development.

---

## Additional UI/UX Fixes

10. **Fix Amenities Badge Styling**
    - Ensure the background color of amenities badges only covers the text and does not stretch beyond it. The badge should hug the word tightly, with minimal horizontal padding.

11. **Full-Width Top Bar**
    - Make the top navigation/header bar (SubletNU) stretch the full width of the screen with no gaps or rounded corners at the top.

12. **Sticky/Fixed Filter Menu**
    - The filter menu should always be directly underneath the top bar, with no overlap with sublet cards.
    - When expanded, the filter menu should not take up the whole screen, but remain just below the top bar and allow sublet cards to load and scroll underneath.
    - Ensure there is no initial overlap or jumpiness when loading the page.
