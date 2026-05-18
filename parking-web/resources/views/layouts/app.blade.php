<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'KeVend - Paneli')</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inder&display=swap" rel="stylesheet">
    <style>
        body { background-color: black; font-family: 'Inter', sans-serif; color: white; }
        .nav-active { background: linear-gradient(135deg, #3080FF 0%, #00358B 59%); border-radius: 50px; }
        .card-bg { background-color: #121212; }
        .glass-row { background: rgba(198, 221, 255, 0.30); border-radius: 12px; }
        .glass-input { background: rgba(198, 221, 255, 0.40); box-shadow: 0px 0px 8px #3080FF; border: 1px solid #3080FF; }
        .btn-gradient { background: linear-gradient(90deg, #3080FF 0%, #00358B 38%, #3080FF 100%, #00358B 63%); background-size: 130% auto; transition: 0.5s; cursor: pointer; }
        .btn-gradient:hover { background-position: right center; }
        .dot-pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(18, 255, 10, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(18, 255, 10, 0); } 100% { box-shadow: 0 0 0 0 rgba(18, 255, 10, 0); } }
        .modal-overlay { display: none; position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.85); align-items: center; justify-content: center; padding: 1rem; }
        .modal-overlay.active { display: flex; }
        .modal-card-light { background: #fff; color: #111; }
        @media print {
            body { background: white !important; color: #111 !important; }
            body * { visibility: hidden !important; }
            .no-print { display: none !important; visibility: hidden !important; }
            #summaryModal.active,
            #summaryModal.active * { visibility: visible !important; }
            #summaryModal.active {
                display: flex !important;
                position: fixed !important;
                inset: 0 !important;
                background: white !important;
                align-items: flex-start !important;
                justify-content: center !important;
                padding: 2rem !important;
            }
            #summaryModal.active #checkoutForm { display: none !important; visibility: hidden !important; }
            #printableReport,
            #printableReport * { visibility: visible !important; }
            #printableReport {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 1.5rem 2rem !important;
                background: white !important;
                color: #111 !important;
            }
            #printableReport .print-card {
                background: #f7f7f7 !important;
                border: 1px solid #ddd !important;
                border-radius: 12px !important;
                color: #111 !important;
            }
            #printableReport .print-row {
                background: #fff !important;
                border: 1px solid #e5e5e5 !important;
                color: #111 !important;
            }
            #printableReport .text-white,
            #printableReport .text-white\/70,
            #printableReport .text-white\/80,
            #printableReport .text-white\/63,
            #printableReport .text-white\/60 { color: #111 !important; }
        }
    </style>
    @stack('head')
</head>
<body class="p-4 md:p-8 min-h-screen">
    <nav class="no-print w-full card-bg rounded-full h-16 md:h-[67px] flex items-center justify-between px-4 md:px-8 mb-10 max-w-[1319px] mx-auto overflow-hidden">
        <div class="flex items-center gap-4">
            <img src="{{ ('Images/logo.png') }}" alt="KeVend Logo" class="h-16">
            @if(session('active_parking_name'))
                <span class="text-white/80 font-semibold text-lg border-l border-white/20 pl-4 hidden sm:inline">
                    {{ session('active_parking_name') }}
                </span>
            @endif
        </div>
        <div class="hidden md:flex items-center h-full gap-2">
            @if(!Auth::user()->isAdmin())
                <a href="{{ url('/') }}" class="px-8 flex items-center h-[50px] font-semibold tracking-wide transition-colors {{ request()->is('/') ? 'nav-active text-white' : 'text-white/70 hover:text-white' }}">Paneli</a>
                <a href="{{ url('/reports') }}" class="px-8 flex items-center h-[50px] font-semibold tracking-wide transition-colors {{ request()->is('reports*') ? 'nav-active text-white' : 'text-white/70 hover:text-white' }}">Raportet</a>
                <a href="{{ url('/settings') }}" class="px-8 flex items-center h-[50px] font-semibold tracking-wide transition-colors {{ request()->is('settings*') ? 'nav-active text-white' : 'text-white/70 hover:text-white' }}">Cilësimet</a>
            @endif
            
            @if(Auth::user()->isAdmin())
                <a href="{{ url('/admin/parkings') }}" class="px-8 flex items-center h-[50px] font-semibold tracking-wide transition-colors {{ request()->is('admin*') ? 'nav-active text-white' : 'text-white/70 hover:text-white' }}">Admin</a>
            @endif
        </div>
        <div class="flex items-center gap-4 md:gap-8">
            <div class="flex items-center gap-2 hidden sm:flex">
                <span class="text-white/50 text-sm font-['Inder']">LIVE</span>
                <div class="w-1.5 h-1.5 bg-[#12FF0A] rounded-full dot-pulse"></div>
            </div>
            <form id="logoutForm" method="POST" action="{{ url('/logout') }}" class="hidden">@csrf</form>
            <button type="button" id="logoutOpenBtn" class="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors rounded-full px-4 py-1.5 cursor-pointer border-0">
                <div class="w-6 h-5 rounded-[4px] flex items-center justify-center">
                    <i class="fa-solid fa-sign-out-alt text-[15px] text-red-600"></i>
                </div>
                <span class="text-[#E50000] font-['Inder'] text-lg hidden sm:inline">Dil</span>
            </button>
        </div>
    </nav>

    <div class="no-print md:hidden flex justify-center gap-2 mb-8 flex-wrap">
        @if(!Auth::user()->isAdmin())
            <a href="{{ url('/') }}" class="px-6 py-2 font-semibold text-sm {{ request()->is('/') ? 'nav-active text-white' : 'text-white/70' }}">Paneli</a>
            <a href="{{ url('/reports') }}" class="px-6 py-2 font-semibold text-sm {{ request()->is('reports*') ? 'nav-active text-white' : 'text-white/70' }}">Raportet</a>
            <a href="{{ url('/settings') }}" class="px-6 py-2 font-semibold text-sm {{ request()->is('settings*') ? 'nav-active text-white' : 'text-white/70' }}">Cilësimet</a>
        @endif
        
        @if(Auth::user()->isAdmin())
            <a href="{{ url('/admin/parkings') }}" class="px-6 py-2 font-semibold text-sm {{ request()->is('admin*') ? 'nav-active text-white' : 'text-white/70' }}">Admin</a>
        @endif
    </div>

    <div class="max-w-[1319px] mx-auto">
        @if(session('success'))
            <div class="no-print glass-row px-6 py-4 mb-6 flex items-center gap-3 text-white border border-[#12FF0A]/40">
                <i class="fa-solid fa-circle-check text-[#12FF0A]"></i>
                <span>{{ session('success') }}</span>
            </div>
        @endif
        @if(session('error'))
            <div class="no-print glass-row px-6 py-4 mb-6 flex items-center gap-3 text-white border border-[#E50000]/40">
                <i class="fa-solid fa-circle-exclamation text-[#E50000]"></i>
                <span>{{ session('error') }}</span>
            </div>
        @endif
        @if(session('warning'))
            <div class="no-print glass-row px-6 py-4 mb-6 flex items-center gap-3 text-white border border-[#3080FF]/40">
                <i class="fa-solid fa-triangle-exclamation text-[#3080FF]"></i>
                <span>{{ session('warning') }}</span>
            </div>
        @endif

        @yield('content')
    </div>

    <div id="logoutConfirmModal" class="modal-overlay" aria-hidden="true">
        <div class="modal-card-light rounded-[22px] px-8 py-10 w-full max-w-md text-center shadow-xl">
            <p class="text-[#111] font-bold text-lg mb-10">Doni të dilni?</p>
            <div class="flex justify-center gap-4 flex-wrap">
                <button type="button" id="logoutCancelBtn" class="px-10 py-3 rounded-full bg-gray-200 hover:bg-gray-300 text-[#111] font-semibold border-0 cursor-pointer">Anullo</button>
                <button type="button" id="logoutConfirmBtn" class="px-10 py-3 rounded-full bg-[#E50000] hover:bg-[#c40000] text-white font-semibold border-0 cursor-pointer">Dil</button>
            </div>
        </div>
    </div>

    <script>
        (function () {
            const modal = document.getElementById('logoutConfirmModal');
            const form = document.getElementById('logoutForm');
            document.getElementById('logoutOpenBtn')?.addEventListener('click', () => modal.classList.add('active'));
            document.getElementById('logoutCancelBtn')?.addEventListener('click', () => modal.classList.remove('active'));
            document.getElementById('logoutConfirmBtn')?.addEventListener('click', () => form?.submit());
            modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
        })();
    </script>
    @stack('scripts')
</body>
</html>
