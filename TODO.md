To Do
- `[x]` - Completed
- `[-]` - On Hold/Won't Fix
- `[/]` - In Progress

## Categories Legend
- 🐛 Bugs - Known issues that need fixing
- ✨ Features - New functionality to implement
- ⬆️ Improvements - Enhancements to existing functionality
- 🏗 Technical Debt - Refactoring and code quality improvements
- 📚 Documentation - Docs that need writing or updating

---

## 🐛 Bugs

- [x] Fix depreciation calculation timezone bug (resolved timezone issues in getMacrsRates)
- [x] Incorporate IRS depreciation tables for accurate MACRS calculations
- [x] Verify MACRS calculations match IRS Publication 946 guidelines
- [x] Fix "Failed to create asset" error in web app (database constraint violation with equipment categories)
     - Added equipment_category validation before database insertion
     - Improved error handling with specific error messages for constraint violations
     - Added detailed error logging for debugging
- [x] Fix "Database error: table assets has no column named equipment_category"
     - Added database migration functionality to handle schema changes
     - Automatically adds missing equipment_category column to existing databases
     - Handles both new installations and existing database upgrades
     - Fixed incorrect database path calculation (../../../data -> ../../data)
- [/] Fix remaining depreciation calculation issues identified in testing
     - Bonus depreciation in year 5 still calculating deductions when asset is already fully depreciated
     - Section 179 expensing not properly limiting deduction to annual limits ($1,250,000 for 2025-2026)
     - Some MACRS calculation discrepancies in bonus depreciation scenarios

## ✨ Features

- [ ] Implement dedicated TODO tracking system
- [ ] Add user authentication (Login/Logout)
- [ ] Create income/expense tracking dashboard
- [ ] Implement equipment inventory management
- [ ] Add gig tracking and scheduling
- [ ] Create financial reporting functionality
- [ ] Add equipment depreciation tracking
- [ ] Implement tax calculation features

## ⬆️ Improvements

- [ ] Enhance UI/UX design to be more Apple-like
- [ ] Improve performance of database queries
- [ ] Add offline support for PWA
- [ ] Implement data export functionality (CSV, PDF)

## 🏗 Technical Debt

- [ ] Refactor repetitive code in API routes
- [ ] Improve error handling consistency
- [ ] Add comprehensive test coverage
- [ ] Optimize database schema for better performance

## 📚 Documentation

- [x] Create this TODO.md file
- [ ] Document API endpoints
- [ ] Add user guide for core features
- [ ] Create deployment documentation