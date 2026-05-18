# Laravel Project Setup

Follow the steps below to set up and run the Laravel project locally.

---

## 1. Install PHP Dependencies

Install all required PHP packages using Composer:

```bash
composer install
```

---

## 2. Set Up Environment File

Copy the example environment file and generate the application key:

```bash
cp .env.example .env
php artisan key:generate
```

Update your `.env` file with the correct database credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
```

Make sure the database exists in your DBMS before continuing.

---

## 3. Run Database Migrations

Run the migrations to create the required database tables:

```bash
php artisan migrate
```

If the project includes seed data, run:

```bash
php artisan db:seed
```

Or run migrations and seeders together:

```bash
php artisan migrate:fresh --seed
```

---

## 4. Install Frontend Dependencies (Optional)

Install Node.js dependencies and compile frontend assets:

```bash
npm install
npm run dev
```

---

## 5. Serve the Application

Start the Laravel development server:

```bash
php artisan serve
```

The application will usually be available at:

```text
http://127.0.0.1:8000
```

---

## Troubleshooting

### Migration Issues After Cloning

If you encounter migration or cache-related issues after cloning the repository, try clearing the Laravel caches:

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

Then rerun the migrations:

```bash
php artisan migrate
```

---

## Requirements

- PHP 8.x
- Composer
- Node.js & npm
- MySQL or another supported database
- Laravel compatible web server environment

---