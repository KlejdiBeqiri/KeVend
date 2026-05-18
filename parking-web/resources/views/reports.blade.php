@extends('layouts.app')

@section('title', 'KeVend - Raportet')

@section('content')
    <div id="printableReport">
        <div class="mb-8 hidden print:block border-b border-gray-300 pb-6">
            <h1 class="text-2xl font-bold text-[#111]">KeVend — Raport ditor</h1>
            <p class="text-gray-600 mt-1">Data: {{ $stats['date'] }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div class="card-bg print-card rounded-[30px] p-8 flex flex-col justify-center gap-4 h-[153px]">
                <h3 class="text-white/70 font-medium text-base">Mjete te larguara:</h3>
                <p class="text-white font-bold text-[45px] leading-none">{{ $stats['total_vehicles'] }}</p>
            </div>
            <div class="card-bg print-card rounded-[30px] p-8 flex flex-col justify-center gap-4 h-[153px]">
                <h3 class="text-white/70 font-medium text-base">Te ardhurat totale:</h3>
                <p class="text-white font-bold text-[45px] flex items-baseline gap-2 leading-none">{{ number_format($stats['total_revenue'], 0, '.', ',') }} <span class="text-[30px]">ALL</span></p>
            </div>
            <div class="card-bg print-card rounded-[30px] p-8 flex flex-col justify-center gap-4 h-[153px]">
                <h3 class="text-white/70 font-medium text-base">Të ardhurat mesatare per makine:</h3>
                <p class="text-white font-bold text-[45px] flex items-baseline gap-2 leading-none">{{ number_format($stats['avg_fee'], 0, '.', ',') }} <span class="text-[30px]">ALL</span></p>
            </div>
        </div>

        <div class="card-bg rounded-[30px] p-8 relative min-h-[300px] no-print mb-10">
            <div class="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                <h2 class="text-white text-[30px] font-semibold">Analiza e Aktivitetit</h2>
                <form method="GET" action="{{ url('/reports') }}" class="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                    <span class="text-white/80 font-medium text-[24px] text-center md:text-left">Gjenero permbledhjen e raportit per daten:</span>
                    <div class="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div class="card-bg border border-white/5 rounded-[34px] px-6 h-[55px] flex items-center w-full sm:w-[220px]">
                            <input type="date" name="date" value="{{ $date }}"
                                class="bg-transparent text-white/80 font-medium text-[19px] w-full outline-none">
                        </div>
                        <button type="submit" class="btn-gradient w-[162px] h-[50px] rounded-[20px] text-white font-medium text-[20px] shadow-lg border-0">
                            Gjenero
                        </button>
                    </div>
                </form>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:px-8 mt-4">
                <div class="glass-row p-8 flex flex-col items-center justify-center min-h-[134px] gap-2 relative group mt-4 md:mt-0">
                    <p class="text-white/63 text-[18px]">Statusi i gjenerimit</p>
                    <div class="flex items-center gap-3">
                        <div class="w-[7px] h-[7px] bg-[#12FF0A] rounded-full dot-pulse"></div>
                        <h3 class="text-white font-medium text-[20px]">Raporti eshte gati</h3>
                    </div>
                    <button type="button" onclick="window.print()" class="absolute -bottom-6 w-[155px] h-[50px] btn-gradient rounded-[20px] flex items-center justify-center gap-2 text-white font-medium text-[16px] shadow-lg hover:-translate-y-1 border-0 cursor-pointer">
                        <div class="w-[19px] h-[19px] bg-white rounded flex items-center justify-center">
                            <i class="fa-solid fa-print text-[#00358B] text-xs"></i>
                        </div>
                        Printo
                    </button>
                </div>

                <div class="glass-row p-8 flex flex-col items-center justify-center min-h-[134px] gap-2 mt-8 md:mt-0">
                    <p class="text-white/63 text-[18px]">Data e raportit</p>
                    <div class="flex items-center gap-3">
                        <div class="w-[7px] h-[7px] bg-[#12FF0A] rounded-full dot-pulse"></div>
                        <h3 class="text-white font-semibold text-[20px]">{{ $stats['date'] }}</h3>
                    </div>
                </div>
            </div>
            <div class="h-8"></div>
        </div>

        @if($records->isNotEmpty())
            <div class="card-bg print-card rounded-[30px] p-8">
                <h2 class="text-white text-[24px] font-semibold mb-6">Detajet e mjeteve ({{ $stats['date'] }})</h2>
                <div class="hidden md:grid grid-cols-5 gap-4 px-4 mb-3 text-white/60 text-sm font-normal border-b border-white/10 pb-3 print:grid print:text-gray-600">
                    <div>Targa</div>
                    <div class="text-center">Hyrja</div>
                    <div class="text-center">Largimi</div>
                    <div class="text-center">Kohezgjatja</div>
                    <div class="text-right">Tarifa</div>
                </div>
                @foreach($records as $d)
                    <div class="glass-row print-row px-4 py-4 mb-3 grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 items-center text-center md:text-left">
                        <div class="text-white font-semibold text-lg">{{ $d->license_plate }}</div>
                        <div class="text-white/80 md:text-center">{{ $d->entry_time->format('H:i') }}</div>
                        <div class="text-white/80 md:text-center">{{ $d->exit_time ? $d->exit_time->format('H:i') : '—' }}</div>
                        <div class="text-white/80 md:text-center font-mono">{{ \App\Models\ParkingRecord::formatDuration($d->duration_minutes) }}</div>
                        <div class="text-white font-bold md:text-right">{{ number_format($d->fee, 0, '.', ',') }} ALL</div>
                    </div>
                @endforeach
            </div>
        @else
            <div class="card-bg print-card rounded-[30px] p-8 text-center">
                <p class="text-white/70 text-lg">Nuk ka mjete të larguara për datën {{ $stats['date'] }}.</p>
            </div>
        @endif
    </div>

    <div class="flex justify-center gap-4 mt-10 flex-wrap no-print">
        <a href="{{ url('/') }}" class="px-8 py-3 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">Kthehu te Paneli</a>
    </div>
@endsection
