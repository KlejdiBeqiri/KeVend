@extends('layouts.app')

@section('title', 'KeVend - Admin')

@section('content')
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-10">
        {{-- Form to register a new parking --}}
        <div class="card-bg rounded-[30px] p-8 flex flex-col">
            <h2 class="text-white text-[30px] font-semibold mb-8">Regjistro Parkim</h2>
            <form method="POST" action="{{ url('/admin/parkings') }}" class="flex flex-col gap-5">
                @csrf
                <div class="flex flex-col gap-2">
                    <label class="text-white/60 text-sm ml-1">Emri i Parkimit</label>
                    <div class="glass-row px-4 py-2 border border-white/10">
                        <input type="text" name="name" value="{{ old('name') }}" placeholder="Parkimi Qëndër" required
                            class="bg-transparent text-white w-full outline-none placeholder-white/20">
                    </div>
                    @error('name') <p class="text-[#E50000] text-xs ml-1">{{ $message }}</p> @enderror
                </div>

                <div class="flex flex-col gap-2">
                    <label class="text-white/60 text-sm ml-1">Zona / Adresa</label>
                    <div class="glass-row px-4 py-2 border border-white/10">
                        <input type="text" name="zone" value="{{ old('zone') }}" placeholder="Tiranë, Bashkia" required
                            class="bg-transparent text-white w-full outline-none placeholder-white/20">
                    </div>
                    @error('zone') <p class="text-[#E50000] text-xs ml-1">{{ $message }}</p> @enderror
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-white/60 text-sm ml-1">Latituda</label>
                        <div class="glass-row px-4 py-2 border border-white/10">
                            <input type="number" step="any" name="latitude" value="{{ old('latitude') }}" placeholder="41.3275" required
                                class="bg-transparent text-white w-full outline-none placeholder-white/20">
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-white/60 text-sm ml-1">Longituda</label>
                        <div class="glass-row px-4 py-2 border border-white/10">
                            <input type="number" step="any" name="longitude" value="{{ old('longitude') }}" placeholder="19.8187" required
                                class="bg-transparent text-white w-full outline-none placeholder-white/20">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-white/60 text-sm ml-1">Kapaciteti Total</label>
                        <div class="glass-row px-4 py-2 border border-white/10">
                            <input type="number" name="total_spots" value="{{ old('total_spots') }}" placeholder="50" required
                                class="bg-transparent text-white w-full outline-none placeholder-white/20">
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-white/60 text-sm ml-1">Çmimi për Orë (ALL)</label>
                        <div class="glass-row px-4 py-2 border border-white/10">
                            <input type="number" step="0.01" name="price_per_hour" value="{{ old('price_per_hour') }}" placeholder="100" required
                                class="bg-transparent text-white w-full outline-none placeholder-white/20">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-white/60 text-sm ml-1">Hapja (Ora)</label>
                        <div class="glass-row px-4 py-2 border border-white/10">
                            <input type="time" name="open_time" value="{{ old('open_time', '08:00') }}" required
                                class="bg-transparent text-white w-full outline-none [color-scheme:dark]">
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-white/60 text-sm ml-1">Mbyllja (Ora)</label>
                        <div class="glass-row px-4 py-2 border border-white/10">
                            <input type="time" name="close_time" value="{{ old('close_time', '22:00') }}" required
                                class="bg-transparent text-white w-full outline-none [color-scheme:dark]">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-white/60 text-sm ml-1">Email i Pronarit</label>
                        <div class="glass-row px-4 py-2 border border-white/10">
                            <input type="email" name="owner_email" value="{{ old('owner_email') }}" placeholder="pronari@kevend.al" required
                                class="bg-transparent text-white w-full outline-none placeholder-white/20">
                        </div>
                        @error('owner_email') <p class="text-[#E50000] text-xs ml-1">{{ $message }}</p> @enderror
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-white/60 text-sm ml-1">Fjalëkalimi i Pronarit</label>
                        <div class="glass-row px-4 py-2 border border-white/10">
                            <input type="password" name="owner_password" placeholder="••••••••" required
                                class="bg-transparent text-white w-full outline-none placeholder-white/20">
                        </div>
                        @error('owner_password') <p class="text-[#E50000] text-xs ml-1">{{ $message }}</p> @enderror
                    </div>
                </div>

                <button type="submit" class="w-full mt-6 h-[55px] rounded-[20px] btn-gradient text-white font-semibold text-lg shadow-lg hover:shadow-[#3080FF]/50 transition-all border-0 cursor-pointer">
                    Regjistro Parkimin
                </button>
            </form>
        </div>

        {{-- List of existing parkings --}}
        <div class="card-bg rounded-[30px] p-8">
            <h2 class="text-white text-[30px] font-semibold mb-8">Parkimet ekzistuese</h2>
            <div class="flex flex-col gap-4">
                @forelse($parkings as $p)
                    <div class="glass-row p-6 flex items-center justify-between border border-white/5">
                        <div class="flex flex-col gap-1">
                            <h4 class="text-white font-semibold text-xl">{{ $p->name }}</h4>
                            <p class="text-white/50 text-sm"><i class="fa-solid fa-location-dot mr-1.5 text-[#3080FF]"></i> {{ $p->zone }}</p>
                            <div class="flex items-center gap-6 mt-3">
                                <span class="text-white/70 text-xs flex items-center gap-1.5"><i class="fa-solid fa-car text-[#3080FF]"></i> {{ $p->total_spots }} vende</span>
                                <span class="text-white/70 text-xs flex items-center gap-1.5"><i class="fa-solid fa-money-bill-1 text-[#3080FF]"></i> {{ number_format($p->price_per_hour, 0) }} ALL / orë</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-3 text-right">
                            <span class="px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest {{ $p->status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30' }}">
                                {{ $p->status }}
                            </span>
                            <div class="flex flex-col gap-0.5">
                                <span class="text-white/60 text-[11px] font-medium">{{ $p->owner?->full_name ?? 'Pa pronar' }}</span>
                                <span class="text-white/30 text-[10px]">{{ $p->owner?->email }}</span>
                            </div>
                        </div>
                    </div>
                @empty
                    <div class="py-20 flex flex-col items-center justify-center text-white/30">
                        <i class="fa-solid fa-parking text-6xl mb-4 opacity-10"></i>
                        <p class="text-lg">Nuk ka parkime të regjistruara.</p>
                    </div>
                @endforelse
            </div>
        </div>
    </div>
@endsection
