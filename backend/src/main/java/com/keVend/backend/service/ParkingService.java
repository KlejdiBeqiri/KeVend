package com.keVend.backend.service;

import com.keVend.backend.dto.ParkingResponse;
import com.keVend.backend.dto.ParkingPriceTierDto;
import com.keVend.backend.dto.ParkingUpsertRequest;
import com.keVend.backend.i18n.I18n;
import com.keVend.backend.model.Parking;
import com.keVend.backend.model.ParkingPriceTier;
import com.keVend.backend.model.User;
import com.keVend.backend.repository.ParkingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ParkingService {

    private final ParkingRepository parkingRepository;
    private final OwnerSubscriptionService ownerSubscriptionService;
    private final I18n i18n;

    @Transactional(readOnly = true)
    public List<ParkingResponse> search(
            String zone,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Double lat,
            Double lng,
            Double radiusKm,
            boolean availableOnly
    ) {
        List<Parking> base = parkingRepository.search(zone, minPrice, maxPrice, availableOnly);

        // F-08 / Stakeholders: hide lots whose owner has no active subscription
        if (ownerSubscriptionService.enforceListingGate()) {
            base = base.stream()
                    .filter(p -> p.getOwner() != null
                            && ownerSubscriptionService.hasActiveSubscription(p.getOwner().getId()))
                    .toList();
        }

        if (lat == null || lng == null) {
            return base.stream().map(ParkingResponse::from).toList();
        }

        // Compute Haversine distance and optionally filter by radius
        return base.stream()
                .map(p -> {
                    Double dist = (p.getLatitude() != null && p.getLongitude() != null)
                            ? haversineKm(lat, lng, p.getLatitude(), p.getLongitude())
                            : null;
                    return ParkingResponse.from(p, dist);
                })
                .filter(r -> radiusKm == null || (r.getDistanceKm() != null && r.getDistanceKm() <= radiusKm))
                .sorted(Comparator.comparing(
                        ParkingResponse::getDistanceKm,
                        Comparator.nullsLast(Double::compareTo)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ParkingResponse getById(Long id) {
        return ParkingResponse.from(loadOrThrow(id));
    }

    @Transactional
    public ParkingResponse create(ParkingUpsertRequest req, User caller) {
        Parking p = new Parking();
        applyUpsert(p, req);
        p.setOwner(caller);
        p.setStatus(req.getAvailableSpots() > 0 ? Parking.Status.OPEN : Parking.Status.FULL);
        return ParkingResponse.from(parkingRepository.save(p));
    }

    @Transactional
    public ParkingResponse update(Long id, ParkingUpsertRequest req, User caller) {
        Parking existing = loadOrThrow(id);
        assertOwner(existing, caller);
        applyUpsert(existing, req);
        return ParkingResponse.from(parkingRepository.save(existing));
    }

    /** FR-11: owner-only manual availability update — propagates within 60s by virtue of being immediate. */
    @Transactional
    public ParkingResponse updateAvailability(Long id, int availableSpots, User caller) {
        if (availableSpots < 0) {
            throw i18n.badRequest("error.parking.invalid_available_spots");
        }
        Parking p = loadOrThrow(id);
        assertOwner(p, caller);
        if (availableSpots > p.getTotalSpots()) {
            throw i18n.badRequest("error.parking.exceeds_total");
        }
        p.setAvailableSpots(availableSpots);
        if (availableSpots == 0 && p.getStatus() == Parking.Status.OPEN) {
            p.setStatus(Parking.Status.FULL);
        } else if (availableSpots > 0 && p.getStatus() == Parking.Status.FULL) {
            p.setStatus(Parking.Status.OPEN);
        }
        return ParkingResponse.from(parkingRepository.save(p));
    }

    @Transactional
    public void delete(Long id, User caller) {
        Parking p = loadOrThrow(id);
        assertOwner(p, caller);
        parkingRepository.delete(p);
    }

    @Transactional(readOnly = true)
    public List<ParkingResponse> listOwnedBy(Long ownerId) {
        return parkingRepository.findByOwnerId(ownerId).stream()
                .map(ParkingResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Parking loadOrThrow(Long id) {
        return parkingRepository.findWithPriceTiersById(id)
                .orElseThrow(() -> i18n.notFound("error.parking.not_found"));
    }

    private void assertOwner(Parking p, User caller) {
        if (p.getOwner() == null || !p.getOwner().getId().equals(caller.getId())) {
            throw i18n.forbidden("error.parking.not_owner");
        }
    }

    private void applyUpsert(Parking p, ParkingUpsertRequest req) {
        p.setName(req.getName());
        p.setZone(req.getZone());
        p.setLatitude(req.getLatitude());
        p.setLongitude(req.getLongitude());
        p.setTotalSpots(req.getTotalSpots());
        p.setAvailableSpots(req.getAvailableSpots());
        applyPricing(p, req.getPricePerHour(), req.getPriceTiers());
        p.setMaxVehicleHeightMeters(req.getMaxVehicleHeightMeters());
        p.getImageUrls().clear();
        if (req.getImageUrls() != null) {
            p.getImageUrls().addAll(
                    req.getImageUrls().stream()
                            .filter(url -> url != null && !url.isBlank())
                            .limit(3)
                            .toList()
            );
        }
        p.setOpenTime(req.getOpenTime());
        p.setCloseTime(req.getCloseTime());
        if (req.getPromotionRank() != null) {
            p.setPromotionRank(req.getPromotionRank());
        }
    }

    private void applyPricing(Parking parking, BigDecimal flatPrice, List<ParkingPriceTierDto> priceTiers) {
        parking.getPriceTiers().clear();

        if (priceTiers != null && !priceTiers.isEmpty()) {
            BigDecimal firstPrice = null;

            for (int index = 0; index < priceTiers.size(); index++) {
                ParkingPriceTierDto dto = priceTiers.get(index);

                if (dto.getFromHour() == null || dto.getToHour() == null || dto.getPrice() == null) {
                    throw i18n.badRequest("error.parking.invalid_pricing_tier");
                }

                if (dto.getToHour() <= dto.getFromHour()) {
                    throw i18n.badRequest("error.parking.invalid_pricing_tier");
                }

                ParkingPriceTier tier = new ParkingPriceTier();
                tier.setParking(parking);
                tier.setFromHour(dto.getFromHour());
                tier.setToHour(dto.getToHour());
                tier.setPrice(dto.getPrice());
                tier.setDisplayOrder(index);
                parking.getPriceTiers().add(tier);

                if (firstPrice == null) {
                    firstPrice = dto.getPrice();
                }
            }

            parking.setPricePerHour(firstPrice);
            return;
        }

        parking.setPricePerHour(flatPrice);
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }
}
