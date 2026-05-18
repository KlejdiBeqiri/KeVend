<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KeVend - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background: linear-gradient(162deg, #022E76 10%, #0D0D0D 70%);
            background-attachment: fixed;
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
        }
        .glass-input {
            background: rgba(198, 221, 255, 0.40);
        }
        .btn-gradient {
            background: linear-gradient(90deg, #3080FF 0%, #00358B 38%, #00358B 63%, #3080FF 100%);
            background-size: 200% auto;
            transition: 0.5s;
        }
        .btn-gradient:hover {
            background-position: right center;
        }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body class="flex flex-col items-center justify-center p-4">
    <div class="mb-12 flex flex-col items-center">
        <img src="{{ ('Images/logo.png') }}" alt="KeVend Logo" class="h-20 mb-8">
        <h1 class="text-white text-4xl md:text-[50px] font-semibold text-center mb-4 leading-tight">Mirë se vini</h1>
        <p class="text-white/70 text-base md:text-lg text-center">Identifikohuni për të menaxhuar parkimin tuaj.</p>
    </div>

    <form method="POST" action="{{ url('/login') }}" class="w-full max-w-md flex flex-col gap-6">
        @csrf
        <div class="w-full flex flex-col gap-1">
            <div class="relative flex items-center">
                <div class="absolute left-4 z-10 text-white flex items-center justify-center">
                    <i class="fa-regular fa-envelope text-lg"></i>
                </div>
                <input type="email" name="email" value="{{ old('email') }}" required autofocus placeholder="E-mail"
                    class="w-full glass-input rounded-xl h-14 pl-12 pr-4 text-white placeholder-white/75 outline-none focus:ring-2 focus:ring-[#3080FF] transition-all tracking-wide">
            </div>
            @error('email')
                <p class="text-sm text-red-300 px-1">{{ $message }}</p>
            @enderror
        </div>

        <div class="w-full flex flex-col gap-1">
            <div class="relative flex items-center">
                <div class="absolute left-4 z-10 text-white flex items-center justify-center">
                    <i class="fa-solid fa-lock text-lg"></i>
                </div>
                <input type="password" name="password" required placeholder="Fjalëkalimi"
                    class="w-full glass-input rounded-xl h-14 pl-12 pr-12 text-white placeholder-white/75 outline-none focus:ring-2 focus:ring-[#3080FF] transition-all tracking-wide">
            </div>
            @error('password')
                <p class="text-sm text-red-300 px-1">{{ $message }}</p>
            @enderror
        </div>

        <div class="flex justify-between items-center px-1">
            <label class="flex items-center gap-2 cursor-pointer text-white text-sm">
                <input type="checkbox" name="remember" value="1" class="w-4 h-4 rounded bg-[#1F4E99]/25 border-white outline outline-1 outline-white accent-[#3080FF]">
                <span>Më mbaj mend</span>
            </label>
            <span class="text-white text-sm italic font-light underline opacity-60 cursor-default">Ke harruar fjalëkalimin?</span>
        </div>

        <div class="w-full max-w-[250px] mx-auto mt-6">
            <button type="submit" class="w-full btn-gradient rounded-[25px] h-14 text-white text-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all border-0">
                Kyçu
            </button>
        </div>
    </form>
</body>
</html>
