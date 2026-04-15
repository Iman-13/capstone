# PYTHONANYWHERE DEPLOYMENT GUIDE

## STEP 1: Create PythonAnywhere Account
1. Go to https://www.pythonanywhere.com
2. Click "Sign up"
3. Create free account
4. Verify email

## STEP 2: Upload Code to PythonAnywhere
1. Log in to PythonAnywhere
2. Go to **Files** tab
3. Open **Bash console**
4. Run these commands:
```bash
git clone https://github.com/Iman-13/capstone.git
cd capstone
cd backend
pip install -r requirements.txt
```

## STEP 3: Build React Frontend
Still in bash console (in backend directory):
```bash
cd ../frontend
npm install
npm run build
```

## STEP 4: Copy Frontend to Static Folder
```bash
mkdir -p ../backend/static/frontend
cp -r dist/* ../backend/static/frontend/
```

## STEP 5: Set Up Web App
1. Go to **Web** tab
2. Click **"Add a new web app"**
3. Choose **"Manual configuration"**
4. Select **Python 3.11**

## STEP 6: Reload & Test
1. Go to **Web** tab
2. Click **"Reload capstone.pythonanywhere.com"**
3. Visit your URL: `https://yourusername.pythonanywhere.com`

## STEP 7: Configure Environment Variables
In bash console:
```bash
cd ~/capstone/backend
export DJANGO_ENV=production
export ALLOWED_HOSTS=yourusername.pythonanywhere.com
export SECRET_KEY=your-secret-key
```

Then reload the web app.

## DONE! 🚀
Your app is now live at: https://yourusername.pythonanywhere.com
- Frontend at: https://yourusername.pythonanywhere.com/
- Backend API at: https://yourusername.pythonanywhere.com/api/
