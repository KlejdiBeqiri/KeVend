@extends('layouts.app')

@section('title', 'KeVend - Cilësimet')

@section('content')
    <div class="max-w-[1150px] mx-auto flex flex-col items-center px-4">
        <h1 class="text-white text-[28px] font-semibold mb-10 md:mb-14 text-center w-full">Konfigurimi i Sistemit</h1>

        <form method="POST" action="{{ url('/settings') }}" id="settingsForm" class="w-full flex flex-col gap-10">
            @csrf

            <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
                <div class="flex flex-col gap-2 w-full">
                    <h3 class="text-white/80 font-medium text-[18px] ml-1 mt-10">Kapaciteti i parkimit</h3>
                    <div class="glass-row w-full min-h-[55px] flex items-center px-6 py-3">
                        <input type="number" name="total_capacity" value="{{ old('total_capacity', $total_capacity) }}"
                            class="bg-transparent text-white text-[20px] font-medium w-full outline-none" min="1" required>
                    </div>
                    @error('total_capacity')
                        <p class="text-[#E50000] text-sm ml-1">{{ $message }}</p>
                    @enderror
                </div>

                <div class="flex flex-col gap-4 w-full">
                    <label class="flex items-center gap-3 cursor-pointer text-white/90 text-[16px] ml-1 select-none">
                        <input type="checkbox" name="same_price_per_hour" value="1" id="samePriceCheckbox"
                            class="w-5 h-5 rounded border-white/30 accent-[#3080FF]"
                            {{ old('same_price_per_hour', $same_price_per_hour ? '1' : '') === '1' ? 'checked' : '' }}>
                        <span>Çdo orë ka të njëjtin çmim</span>
                    </label>

                    <div id="flatRateBlock" class="flex flex-col gap-2 {{ old('same_price_per_hour', $same_price_per_hour ? '1' : '0') === '1' ? '' : 'hidden' }}">
                        <h3 class="text-white/80 font-medium text-[18px] ml-1">Çmimi për orë (ALL)</h3>
                        <div class="glass-row w-full min-h-[55px] flex items-center px-6 py-3">
                            <input type="number" step="0.01" id="hourlyRateFlat"
                                value="{{ old('hourly_rate', $hourly_rate) }}"
                                class="bg-transparent text-white text-[20px] font-medium w-full outline-none" min="0">
                        </div>
                        @error('hourly_rate')
                            <p class="text-[#E50000] text-sm ml-1">{{ $message }}</p>
                        @enderror
                    </div>

                    <div id="tieredBlock" class="flex flex-col gap-3 {{ old('same_price_per_hour', $same_price_per_hour ? '1' : '0') === '1' ? 'hidden' : '' }}">
                        <p class="text-white/50 text-sm ml-1">Shtoni intervale orësh dhe çmimin për secilin.</p>
                        <div class="rounded-[14px] bg-[#3c4048] min-h-[80px] overflow-hidden" id="tiersList"></div>
                        <button type="button" id="openAddTierModal"
                            class="self-start flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium border-0 cursor-pointer">
                            <i class="fa-solid fa-plus"></i> Shto Orar
                        </button>
                        <div class="flex flex-col gap-2 mt-2">
                            <h3 class="text-white/80 font-medium text-[16px] ml-1">Çmimi për orët e papërfshira (ALL)</h3>
                            <div class="glass-row w-full min-h-[50px] flex items-center px-6 py-2">
                                <input type="number" step="0.01" id="hourlyRateOverflow"
                                    value="{{ old('hourly_rate', $hourly_rate) }}"
                                    class="bg-transparent text-white text-lg font-medium w-full outline-none" min="0">
                            </div>
                        </div>
                        @error('pricing_tiers')
                            <p class="text-[#E50000] text-sm ml-1">{{ $message }}</p>
                        @enderror
                    </div>
                </div>
            </div>

            <input type="hidden" name="pricing_tiers" id="pricingTiersJson" value="{{ old('pricing_tiers', json_encode($pricing_tiers)) }}">

            @if(!empty($backendParking) && config('services.kevend_backend.parking_id'))
                <div class="w-full">
                    <div class="glass-row px-6 py-4 text-white/80 text-sm">
                        <i class="fa-solid fa-database text-[#3080FF] mr-2"></i>
                        Parkimi në Spring Boot (ID {{ config('services.kevend_backend.parking_id') }}):
                        <span class="text-white font-medium">{{ $backendParking['name'] ?? '—' }}</span>
                        @if(isset($backendParking['totalSpots']))
                            · Vende: {{ $backendParking['totalSpots'] }}
                        @endif
                        @if(isset($backendParking['pricePerHour']))
                            · {{ $backendParking['pricePerHour'] }} ALL/orë
                        @endif
                    </div>
                </div>
            @endif

            <button type="submit"
                class="btn-gradient w-full max-w-[405px] mx-auto h-[55px] rounded-[20px] text-white text-[20px] font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all border-0 cursor-pointer">
                Ruaj Ndryshimet
            </button>
        </form>
    </div>

    <div id="addTierModal" class="modal-overlay" aria-hidden="true">
        <div class="modal-card-light rounded-[20px] p-8 w-full max-w-md shadow-xl">
            <h2 class="text-center text-[#111] font-bold text-xl mb-8">Shto Orar</h2>
            <div class="space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span class="text-[#333] font-medium shrink-0">Intervali kohor :</span>
                    <div class="flex items-center gap-2 flex-1 justify-end">
                        <input type="number" id="tierFrom" min="0" max="999" placeholder="00"
                            class="tier-input w-20 h-11 rounded-lg border border-gray-200 text-center text-[#111] font-medium outline-none focus:ring-2 focus:ring-[#3080FF]/40">
                        <span class="text-[#666]">-</span>
                        <input type="number" id="tierTo" min="1" max="1000" placeholder="00"
                            class="tier-input w-20 h-11 rounded-lg border border-gray-200 text-center text-[#111] font-medium outline-none focus:ring-2 focus:ring-[#3080FF]/40">
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span class="text-[#333] font-medium shrink-0">Përcakto çmimin :</span>
                    <div class="flex items-center gap-2 flex-1 justify-end">
                        <input type="number" step="0.01" min="0" id="tierAmount" placeholder="0"
                            class="tier-input flex-1 max-w-[180px] h-11 rounded-lg border border-gray-200 px-3 text-[#111] font-medium outline-none focus:ring-2 focus:ring-[#3080FF]/40">
                        <span class="text-[#666] text-sm font-medium">ALL</span>
                    </div>
                </div>
            </div>
            <div class="flex justify-end mt-10">
                <button type="button" id="confirmAddTier"
                    class="bg-[#E50000] hover:bg-[#c40000] text-white font-semibold px-10 py-3 rounded-[14px] border-0 cursor-pointer">
                    Shto
                </button>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
    <script>
        (function () {
            const sameCb = document.getElementById('samePriceCheckbox');
            const flatBlock = document.getElementById('flatRateBlock');
            const tieredBlock = document.getElementById('tieredBlock');
            const hourlyFlat = document.getElementById('hourlyRateFlat');
            const hourlyOverflow = document.getElementById('hourlyRateOverflow');
            const tiersList = document.getElementById('tiersList');
            const hiddenTiers = document.getElementById('pricingTiersJson');
            const addModal = document.getElementById('addTierModal');

            function readTiers() {
                try {
                    return JSON.parse(hiddenTiers.value || '[]');
                } catch (e) {
                    return [];
                }
            }

            function writeTiers(arr) {
                hiddenTiers.value = JSON.stringify(arr);
            }

            function tiersOverlap(a, b) {
                return a.from < b.to && b.from < a.to;
            }

            function nextTierFrom(tiers) {
                if (!tiers.length) return 0;
                return Math.max(...tiers.map(t => t.to));
            }

            function formatTierAmount(amount) {
                const n = Number(amount);
                return Number.isInteger(n) || n % 1 === 0
                    ? String(Math.round(n))
                    : n.toLocaleString('sq-AL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }

            function syncSameMode() {
                const same = sameCb.checked;
                flatBlock.classList.toggle('hidden', !same);
                tieredBlock.classList.toggle('hidden', same);
                if (same) {
                    if (hourlyOverflow && hourlyFlat) {
                        hourlyFlat.value = hourlyFlat.value || hourlyOverflow.value;
                    }
                    hourlyFlat.setAttribute('name', 'hourly_rate');
                    hourlyFlat.removeAttribute('disabled');
                    if (hourlyOverflow) {
                        hourlyOverflow.removeAttribute('name');
                        hourlyOverflow.setAttribute('disabled', 'disabled');
                    }
                } else {
                    if (hourlyOverflow && hourlyFlat) {
                        hourlyOverflow.value = hourlyOverflow.value || hourlyFlat.value;
                    }
                    hourlyFlat.removeAttribute('name');
                    hourlyFlat.setAttribute('disabled', 'disabled');
                    if (hourlyOverflow) {
                        hourlyOverflow.setAttribute('name', 'hourly_rate');
                        hourlyOverflow.removeAttribute('disabled');
                    }
                }
            }

            function renderTiersList(tiers) {
                let html = '';
                tiers.forEach((t, i) => {
                    html += `<div class="tier-row group relative flex items-stretch border-b border-white/10 last:border-b-0 text-white" data-idx="${i}">
                        <div class="flex-[0.42] min-w-0 px-5 py-4 font-medium text-[17px]">${t.from} - ${t.to}</div>
                        <div class="w-px bg-white/25 shrink-0 my-3" aria-hidden="true"></div>
                        <div class="flex-1 min-w-0 px-5 py-4 text-right font-medium text-[17px]">${formatTierAmount(t.amount)} ALL</div>
                        <button type="button" class="tier-remove absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[#E50000] text-xs px-2 py-1 rounded hover:bg-black/20 border-0 cursor-pointer bg-transparent" data-idx="${i}" title="Hiq">×</button>
                    </div>`;
                });
                if (!html) {
                    html = '<p class="text-white/40 text-sm py-6 text-center" id="tiersEmpty">Nuk ka orare të shtuar.</p>';
                }
                tiersList.innerHTML = html;
                tiersList.querySelectorAll('.tier-remove').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.dataset.idx, 10);
                        const next = readTiers().filter((_, j) => j !== idx);
                        writeTiers(next);
                        renderTiersList(next);
                    });
                });
            }

            sameCb.addEventListener('change', () => {
                syncSameMode();
                if (!sameCb.checked) {
                    renderTiersList(readTiers());
                }
            });
            syncSameMode();

            document.getElementById('openAddTierModal').addEventListener('click', () => {
                const tiers = readTiers();
                const suggested = nextTierFrom(tiers);
                document.getElementById('tierFrom').value = suggested;
                document.getElementById('tierTo').value = '';
                document.getElementById('tierAmount').value = '';
                addModal.classList.add('active');
            });
            addModal.addEventListener('click', (e) => {
                if (e.target === addModal) addModal.classList.remove('active');
            });

            document.getElementById('confirmAddTier').addEventListener('click', () => {
                const from = parseInt(document.getElementById('tierFrom').value, 10);
                const to = parseInt(document.getElementById('tierTo').value, 10);
                const amount = parseFloat(document.getElementById('tierAmount').value);
                if (Number.isNaN(from) || Number.isNaN(to) || from < 0 || to <= from || to > 1000) {
                    alert('Intervali duhet të jetë i vlefshëm (0 ≤ fillimi < mbarimi ≤ 1000).');
                    return;
                }
                if (Number.isNaN(amount) || amount < 0) {
                    alert('Shënoni një çmim të vlefshëm.');
                    return;
                }
                const tiers = readTiers();
                const candidate = { from, to, amount, per_hour: false };
                if (tiers.some(t => tiersOverlap(t, candidate))) {
                    alert('Ky interval mbivendoset me një orar ekzistues. Pas p.sh. 0-2, intervali tjetër duhet të fillojë nga 2 (p.sh. 2-4).');
                    return;
                }
                tiers.push(candidate);
                tiers.sort((a, b) => a.from - b.from);
                writeTiers(tiers);
                renderTiersList(tiers);
                addModal.classList.remove('active');
            });

            renderTiersList(readTiers());
        })();
    </script>
@endpush
