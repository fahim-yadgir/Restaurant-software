# Manual test checklist
1. `npm run build` completes without errors.
2. **Admin**: open `/admin/login`, sign in, open *Restaurants & Plans* (URL becomes `/admin/restaurants`).
3. Register a restaurant (all fields, 90 days). Check the code, login details and *Copy details to send*; refresh the page and confirm the record is still there.
4. Try registering the same email or mobile again → rejected.
5. **Activation**: open `/` in the same browser. A wrong code shows an error; the right code shows the restaurant and owner details. Confirm → countdown starts. Re-using the code is rejected.
6. **Owner login**: wrong password is rejected; the registered email *and* the mobile number both work with the right password.
7. Dashboard shows the restaurant name, the top-bar countdown and Settings shows owner and subscription details. Go offline (browser dev tools) and confirm billing still works.
8. Create a bill, add an expense, add a menu item, refresh → data is still there.
9. **Expiry**: register a 7-day plan, activate it, then move the PC date forward 8 days (or edit `expiresAt` in `rd_license` and `rd_registry`). Operations lock, the contact details show, no self-renew button, saved data is kept. Moving the clock back must not unlock it.
10. **Renewal**: in admin click *Renew* on the expired restaurant, then press *Check for renewal* on the owner screen → unlocked.
11. Admin *Reset password*: the old password stops working, the new one works.
12. Delete an un-activated restaurant → its code stops working. Activated restaurants cannot be deleted.
