@extends('layouts.app')

@section('title', 'KeVend - Paneli')

@section('content')
    @if(isset($no_parking) && $no_parking)
        <div class="card-bg rounded-[30px] p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div class="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                <i class="fa-solid fa-parking text-white/40 text-4xl"></i>
            </div>
            <h2 class="text-white text-3xl font-bold mb-4">Nuk keni asnjë parkim të caktuar</h2>
            <p class="text-white/60 text-lg max-w-md">Ju lutem kontaktoni administratorin për të krijuar ose lidhur një parkim me llogarinë tuaj.</p>
        </div>
    @else
        @php
            $revenue = $departures->where('status', 'paid')->sum('fee');
            $sameTarif = \App\Models\Setting::get('same_price_per_hour', '1') === '1';
            $hr = (float) \App\Models\Setting::get('hourly_rate', 100);
        @endphp


    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-5">
        <div class="card-bg rounded-[30px] p-8 flex flex-col justify-center gap-4 h-[120px]">
            <h3 class="text-white/70 font-medium text-base">Parkuar:</h3>
            <p class="text-white font-bold text-[45px] leading-none text-center">{{ $parked->count() }}</p>
        </div>
        <div class="card-bg rounded-[30px] p-8 flex flex-col justify-center gap-4 h-[120px]">
            <h3 class="text-white/70 font-medium text-base">Vende të lira:</h3>
            <p class="text-white font-bold text-[45px] leading-none text-center">{{ $available }}</p>
        </div>
        <div class="card-bg rounded-[30px] p-8 flex flex-col justify-center gap-4 h-[120px]">
            <h3 class="text-white/70 font-medium text-base">Të ardhurat ditore:</h3>
            <p class="text-[#E50000] font-bold text-[45px] leading-none text-center">{{ number_format($revenue, 0, '.', ',') }} <span class="text-[30px]">ALL</span></p>
        </div>
        {{-- Live reservation counter card --}}
        <div class="card-bg rounded-[30px] p-8 flex flex-col justify-center gap-4 h-[120px] relative overflow-hidden">
            <div class="absolute top-4 right-4 flex items-center gap-1.5">
                <span class="text-white/40 text-xs font-['Inder']">LIVE</span>
                <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full dot-pulse"></div>
            </div>
            <h3 class="text-white/70 font-medium text-base">Rezervime aktive:</h3>
            <p id="liveReservationCount" class="text-emerald-400 font-bold text-[45px] leading-none text-center">{{ $reservationCount }}</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div class="card-bg rounded-[30px] p-8 min-h-[400px] flex flex-col items-left">
            <h2 class="text-white text-[30px] font-semibold mb-6 mt-4">Hyrje të reja</h2>
            <form method="POST" action="{{ url('/vehicles') }}" class="w-full flex-grow flex flex-col justify-center items-center gap-4 mb-4" novalidate>
                @csrf
                <label class="text-white/60 text-base text-left w-full ">Targa e Automjetit</label>
                <div class="w-full max-w-[395px] relative">
                    <input type="text" id="license_plate" name="license_plate" value="{{ old('license_plate') }}"
                        placeholder="AB 000 AA" maxlength="9" autocomplete="off" autofocus
                        class="w-full h-[50px] rounded-xl glass-input text-left text-white font-medium text-lg outline-none uppercase placeholder-white/50 pl-4 pr-32">
                    {{-- Reservation badge — appears dynamically --}}
                    <div id="plateBadge" class="absolute right-2 top-1/2 -translate-y-1/2 hidden">
                        <span id="plateBadgeText" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"></span>
                    </div>
                </div>
                @error('license_plate')
                    <p class="text-[#E50000] text-sm w-full max-w-[395px] text-left">{{ $message }}</p>
                @enderror
                @if($available > 0)
                    <button type="submit" class="w-full max-w-[395px] mt-6 h-[50px] rounded-[20px] btn-gradient text-white font-semibold text-base shadow-lg hover:shadow-[#3080FF]/50 transition-all border-0">
                        Regjistro Automjetin
                    </button>
                @else
                    <button type="button" disabled class="w-full max-w-[395px] mt-6 h-[50px] rounded-[20px] bg-white/10 text-white/50 font-semibold cursor-not-allowed border-0">
                        Parkimi është plot
                    </button>
                @endif
            </form>
            <p class="text-white/50 text-sm mt-4 text-center">
                @if($sameTarif)
                    Tarifa: <span class="text-white font-semibold">{{ number_format($hr, 0, '.', ',') }} ALL</span> / orë
                @else
                    Tarifat sipas <span class="text-white font-semibold">orarit</span> në cilësime
                @endif
            </p>
        </div>

        <div class="card-bg rounded-[30px] p-8 min-h-[400px]">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <h2 class="text-white text-[30px] font-semibold text-center md:text-left md:ml-4">Mjetet e parkuara</h2>
                <form method="GET" action="{{ url('/') }}" class="relative w-full md:max-w-xs">
                    <input type="text" name="search" value="{{ $search }}" placeholder="Kërko targën..."
                        class="w-full h-12 rounded-full glass-input pl-10 pr-4 text-white text-sm outline-none placeholder-white/50">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-white/50"></i>
                </form>
            </div>

            @if($parked->isEmpty() && $pendingReservations->isEmpty())
                <div class="flex flex-col items-center justify-center py-16 text-white/40">
                    <i class="fa-solid fa-car text-5xl mb-4 opacity-30"></i>
                    <p>Nuk ka mjete në listë.</p>
                </div>
            @else
                <div class="w-full">
                    <div class="grid grid-cols-5 gap-4 px-6 mb-3 text-white/60 text-base font-normal hidden md:grid">
                        <div class="col-span-1 text-left">Targa e Automjetit</div>
                        <div class="col-span-1 text-center">Hyrja</div>
                        <div class="col-span-1 text-center">Kohezgjatja</div>
                        <div class="col-span-1 text-center">Statusi</div>
                        <div class="col-span-1 text-right"></div>
                    </div>

                    {{-- 1. Pending reservations (reserved via app, NOT yet physically arrived) --}}
                    @foreach($pendingReservations as $pres)
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-center px-4 md:px-6 h-auto py-4 md:h-[70px] md:py-0 glass-row mb-4 border-l-4 border-l-emerald-400/60" data-plate="{{ strtoupper($pres->vehicle_plate) }}">
                            <div class="col-span-1 text-white font-semibold text-xl text-center md:text-left">{{ strtoupper($pres->vehicle_plate) }}</div>
                            <div class="col-span-1 text-white/40 font-medium text-base text-center">&mdash;</div>
                            <div class="col-span-1 text-white/40 font-medium text-base text-center">&mdash;</div>
                            <div class="col-span-1 flex justify-center">
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border {{ $pres->status_color }}">
                                    <i class="fa-solid fa-circle text-[6px]"></i> Rezervuar
                                </span>
                            </div>
                            <div class="col-span-1 flex justify-center md:justify-end">
                                <span class="text-white/30 text-sm italic">Në pritje</span>
                            </div>
                        </div>
                    @endforeach

                    {{-- 2. Physically parked vehicles --}}
                    @foreach($parked as $v)
                        @php
                            $res = $parkedReservations[strtoupper($v->license_plate)] ?? null;
                        @endphp
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-center px-4 md:px-6 h-auto py-4 md:h-[70px] md:py-0 glass-row mb-4" data-plate="{{ $v->license_plate }}">
                            <div class="col-span-1 text-white font-semibold text-xl text-center md:text-left">{{ $v->license_plate }}</div>
                            <div class="col-span-1 text-white font-medium text-base text-center">{{ $v->entry_time->format('H:i') }}</div>
                            <div class="col-span-1 text-white font-medium text-base text-center font-mono" data-entry="{{ $v->entry_time->toIso8601String() }}">
                                @php $mins = (int) ceil($v->entry_time->diffInMinutes(now())); @endphp
                                {{ \App\Models\ParkingRecord::formatDuration($mins) }}
                            </div>
                            <div class="col-span-1 flex justify-center">
                                @if($res)
                                    <span class="plate-reservation-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border {{ $res->status_color }}">
                                        <i class="fa-solid fa-circle text-[6px]"></i> Rezervuar
                                    </span>
                                @else
                                    <span class="plate-reservation-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-white/5 text-white/30 border-white/10">
                                        <i class="fa-solid fa-circle text-[6px]"></i> Pa rezervim
                                    </span>
                                @endif
                            </div>
                            <div class="col-span-1 flex justify-center md:justify-end">
                                <button type="button"
                                    onclick="openSummary({{ $v->id }}, '{{ $v->license_plate }}', '{{ $v->entry_time->toIso8601String() }}', '{{ $v->entry_time->format('d/m/Y H:i') }}')"
                                    class="btn-gradient w-[140px] h-[47px] rounded-[20px] text-white font-semibold text-lg flex items-center justify-center hover:-translate-y-0.5 border-0">
                                    U largua
                                </button>
                            </div>
                        </div>
                    @endforeach
                </div>
            @endif
        </div>
    </div>


    {{-- Permbledhje + pagesë --}}
    <div id="summaryModal" class="modal-overlay" aria-hidden="true">
        <div class="modal-card-light rounded-[22px] p-8 w-full max-w-md shadow-xl">
            <h2 class="text-[#111] font-bold text-xl text-center mb-8">Përmbledhje</h2>
            <div id="printableInvoice" class="space-y-4 text-left text-[#222] mb-8">
                <div class="flex justify-between gap-4 border-b border-gray-100 pb-3">
                    <span class="text-gray-500">Targa:</span>
                    <span class="font-semibold" id="invPlate"></span>
                </div>
                <div class="flex justify-between gap-4 border-b border-gray-100 pb-3">
                    <span class="text-gray-500">Hyrja:</span>
                    <span class="font-medium" id="invEntry"></span>
                </div>
                <div class="flex justify-between gap-4 border-b border-gray-100 pb-3">
                    <span class="text-gray-500">Kohëzgjatja:</span>
                    <span class="font-mono font-medium" id="invDur"></span>
                </div>
                <div class="flex justify-between gap-4 pt-1">
                    <span class="text-gray-500">Tarifa totale:</span>
                    <span class="font-bold text-[#111]" id="invFee"></span>
                </div>
            </div>
            <form id="checkoutForm" method="POST" action="" class="flex flex-col gap-3">
                @csrf
                <div class="flex flex-col sm:flex-row gap-3 justify-between">
                    <button type="button" onclick="closeSummary()" class="rounded-[14px] h-11 w-20 bg-gray-100 text-[#333] font-medium hover:bg-gray-200 border-0 cursor-pointer">Mbyll</button>
                    <button type="submit"
                        class="order-1 sm:order-2 flex-1 min-h-[48px] rounded-[14px] bg-[#E50000] hover:bg-[#c40000] text-white font-semibold border-0 cursor-pointer">
                        Ruaj faturën    
                    </button>
                </div>
            </form>
        </div>
    </div>
    @endif
@endsection

@push('scripts')
    <script>
        // ================================================================
        // PRICING (existing logic)
        // ================================================================
        const PRICING = @json($pricingForJs ?? ['samePricePerHour' => true, 'hourlyRate' => 100, 'tiers' => []]);

        function billedHoursFromMinutes(mins) {
            return Math.max(1, Math.ceil(Math.max(0, mins) / 60));
        }

        function computeFee(mins) {
            const H = billedHoursFromMinutes(mins);
            if (PRICING.samePricePerHour) {
                return Math.round(H * Number(PRICING.hourlyRate) * 100) / 100;
            }
            const tiers = Array.isArray(PRICING.tiers) ? [...PRICING.tiers].sort((a, b) => (a.from ?? 0) - (b.from ?? 0)) : [];
            if (!tiers.length) {
                return Math.round(H * Number(PRICING.hourlyRate) * 100) / 100;
            }
            let fee = 0;
            let coveredUntil = 0;
            for (const t of tiers) {
                const from = parseInt(t.from, 10) || 0;
                const to = parseInt(t.to, 10) || 0;
                if (to <= from) continue;
                if (H <= from) break;
                const overlapEnd = Math.min(H, to);
                if (overlapEnd <= from) continue;
                const hoursInTier = overlapEnd - Math.max(coveredUntil, from);
                if (hoursInTier <= 0) continue;
                const perHour = !!t.per_hour;
                const amount = Number(t.amount) || 0;
                if (perHour) fee += hoursInTier * amount;
                else fee += amount;
                coveredUntil = Math.max(coveredUntil, overlapEnd);
                if (coveredUntil >= H) break;
            }
            if (coveredUntil < H) fee += (H - coveredUntil) * Number(PRICING.hourlyRate);
            return Math.round(Math.max(0, fee) * 100) / 100;
        }

        function pad2(n) {
            return String(n).padStart(2, '0');
        }

        function fmtDurationClockFromSeconds(totalSec) {
            totalSec = Math.max(0, totalSec);
            const h = Math.floor(totalSec / 3600);
            const m = Math.floor((totalSec % 3600) / 60);
            const s = totalSec % 60;
            return pad2(h) + ':' + pad2(m) + ':' + pad2(s) + ' h';
        }

        function fmtDurShort(mins) {
            const h = Math.floor(mins / 60),
                m = mins % 60;
            if (h === 0) return m + 'm';
            if (m === 0) return h + 'o';
            return h + 'o ' + m + 'm';
        }

        function openSummary(id, plate, entryIso, entryLabel) {
            const entryTime = new Date(entryIso);
            const now = new Date();
            const diffMs = now - entryTime;
            const totalSec = Math.floor(diffMs / 1000);
            const mins = Math.max(1, Math.ceil(diffMs / 60000));
            const fee = computeFee(mins);

            document.getElementById('invPlate').textContent = plate;
            document.getElementById('invEntry').textContent = entryLabel;
            document.getElementById('invDur').textContent = fmtDurationClockFromSeconds(totalSec);
            document.getElementById('invFee').textContent = fee.toLocaleString('sq-AL') + ' ALL';

            const form = document.getElementById('checkoutForm');
            form.action = @json(url('/vehicles')) + '/' + id + '/finalize';

            document.getElementById('summaryModal').classList.add('active');
        }

        function closeSummary() {
            document.getElementById('summaryModal').classList.remove('active');
        }

        function printInvoice() {
            window.print();
        }

        document.getElementById('summaryModal').addEventListener('click', function (e) {
            if (e.target === this) closeSummary();
        });

        function refreshDurations() {
            document.querySelectorAll('[data-entry]').forEach(el => {
                const entry = new Date(el.dataset.entry);
                const mins = Math.floor((Date.now() - entry) / 60000);
                el.textContent = fmtDurShort(Math.max(0, mins));
            });
        }
        refreshDurations();
        setInterval(refreshDurations, 60000);

        const inp = document.getElementById('license_plate');
        if (inp) {
            inp.addEventListener('input', function () {
                const p = this.selectionStart;
                this.value = this.value.toUpperCase();
                this.setSelectionRange(p, p);
            });
        }

        // ================================================================
        // LIVE POLLING — update reservation counter + plate badge
        // ================================================================
        (function () {
            const POLL_INTERVAL = 10000;

            function pollStats() {
                fetch('/api/reservations/stats', {
                    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin'
                })
                .then(res => res.json())
                .then(data => {
                    const el = document.getElementById('liveReservationCount');
                    if (el) {
                        const newCount = data.active_reservations || 0;
                        if (el.textContent !== String(newCount)) {
                            el.textContent = newCount;
                            el.classList.add('scale-110');
                            setTimeout(() => el.classList.remove('scale-110'), 300);
                        }
                    }
                })
                .catch(() => {});
            }

            setInterval(pollStats, POLL_INTERVAL);

            // ----- License plate input: check reservation status -----
            const plateInput = document.getElementById('license_plate');
            const badge = document.getElementById('plateBadge');
            const badgeText = document.getElementById('plateBadgeText');

            if (plateInput && badge && badgeText) {
                let checkTimeout = null;
                plateInput.addEventListener('input', function () {
                    clearTimeout(checkTimeout);
                    const val = this.value.replace(/\s/g, '');
                    if (val.length < 2) {
                        badge.classList.add('hidden');
                        return;
                    }
                    checkTimeout = setTimeout(() => {
                        fetch('/api/reservations/check-plate?plate=' + encodeURIComponent(val), {
                            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                            credentials: 'same-origin'
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.reserved) {
                                badgeText.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                                badgeText.innerHTML = '<i class="fa-solid fa-circle-check text-[8px]"></i> Rezervuar';
                                badge.classList.remove('hidden');
                            } else {
                                badgeText.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-white/10 text-white/50 border-white/20';
                                badgeText.innerHTML = '<i class="fa-solid fa-circle-xmark text-[8px]"></i> Pa rezervim';
                                badge.classList.remove('hidden');
                            }
                        })
                        .catch(() => badge.classList.add('hidden'));
                    }, 400);
                });
            }
        })();
    </script>

    <style>
        #liveReservationCount {
            transition: transform 0.3s ease;
        }
    </style>
@endpush
