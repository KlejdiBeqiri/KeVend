package com.keVend.backend.config;

import com.keVend.backend.model.Parking;
import com.keVend.backend.model.ParkingPriceTier;
import com.keVend.backend.repository.ParkingRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Configuration
@Profile("local")
public class LocalParkingSeedConfig {

    @Bean
    CommandLineRunner seedLocalParkings(ParkingRepository parkingRepository) {
        return args -> {
            ensureParking(parkingRepository, "Blloku Central Parking", "Blloku",
                    41.3207, 19.8152, 120, 48, "140", Parking.Status.OPEN,
                    LocalTime.of(0, 0), LocalTime.of(23, 59), 8);
            ensureParking(parkingRepository, "Qendra City Garage", "Qendra",
                    41.3271, 19.8187, 180, 112, "180", Parking.Status.OPEN,
                    LocalTime.of(6, 0), LocalTime.of(23, 0), 6);
            ensureParking(parkingRepository, "Pazari i Ri Parking", "Pazari i Ri",
                    41.3309, 19.8261, 90, 24, "100", Parking.Status.OPEN,
                    LocalTime.of(7, 0), LocalTime.of(22, 30), 5);
            ensureParking(parkingRepository, "Liqeni View Parking", "Liqeni",
                    41.3161, 19.8077, 75, 19, "160", Parking.Status.OPEN,
                    LocalTime.of(6, 30), LocalTime.of(23, 30), 7);
            ensureParking(parkingRepository, "Komuna Premium Lot", "Komuna e Parisit",
                    41.3139, 19.8018, 110, 8, "200", Parking.Status.OPEN,
                    LocalTime.of(0, 0), LocalTime.of(23, 59), 9);
            ensureParking(parkingRepository, "21 Dhjetori Hub", "21 Dhjetori",
                    41.3254, 19.7907, 130, 54, "120", Parking.Status.OPEN,
                    LocalTime.of(6, 0), LocalTime.of(23, 0), 4);
            ensureParking(parkingRepository, "Stadiumi Arena Parking", "Air Albania",
                    41.3186, 19.8214, 95, 0, "220", Parking.Status.FULL,
                    LocalTime.of(0, 0), LocalTime.of(23, 59), 10);
            ensureParking(parkingRepository, "Myslym Shyri Smart Park", "Myslym Shyri",
                    41.3231, 19.8121, 60, 16, "150", Parking.Status.OPEN,
                    LocalTime.of(7, 0), LocalTime.of(22, 0), 5);
            ensureParking(parkingRepository, "Don Bosko Easy Park", "Don Bosko",
                    41.3415, 19.7929, 88, 33, "90", Parking.Status.OPEN,
                    LocalTime.of(6, 0), LocalTime.of(23, 0), 3);
            ensureParking(parkingRepository, "Medreseja Corner Parking", "Medreseja",
                    41.3395, 19.8272, 52, 12, "80", Parking.Status.OPEN,
                    LocalTime.of(8, 0), LocalTime.of(21, 0), 2);
            ensureParking(parkingRepository, "TEG Long Stay Parking", "TEG",
                    41.2912, 19.8721, 260, 143, "250", Parking.Status.OPEN,
                    LocalTime.of(0, 0), LocalTime.of(23, 59), 6);
            ensureParking(parkingRepository, "Oxhaku Neighborhood Parking", "Oxhaku",
                    41.3472, 19.8363, 45, 0, "70", Parking.Status.CLOSED,
                    LocalTime.of(8, 0), LocalTime.of(20, 0), 1);

            updateTieredPricing(parkingRepository, "Blloku Central Parking",
                    new String[][]{
                            {"0", "1", "140"},
                            {"1", "2", "260"},
                            {"2", "4", "480"},
                            {"4", "8", "880"}
                    });
            updateTieredPricing(parkingRepository, "Komuna Premium Lot",
                    new String[][]{
                            {"0", "1", "200"},
                            {"1", "3", "540"},
                            {"3", "6", "960"},
                            {"6", "12", "1700"}
                    });
            updateTieredPricing(parkingRepository, "TEG Long Stay Parking",
                    new String[][]{
                            {"0", "2", "250"},
                            {"2", "5", "620"},
                            {"5", "10", "1100"},
                            {"10", "24", "1800"}
                    });
        };
    }

    private void ensureParking(
            ParkingRepository parkingRepository,
            String name,
            String zone,
            double latitude,
            double longitude,
            int totalSpots,
            int availableSpots,
            String pricePerHour,
            Parking.Status status,
            LocalTime openTime,
            LocalTime closeTime,
            int promotionRank
    ) {
        var existing = parkingRepository.findWithPriceTiersByNameIgnoreCase(name);
        if (existing.isPresent()) {
            Parking parking = existing.get();
            if (parking.getImageUrls() == null || parking.getImageUrls().isEmpty()) {
                parking.getImageUrls().clear();
                parking.getImageUrls().addAll(defaultImagesFor(name));
                parkingRepository.save(parking);
            }
            return;
        }

        LocalDate today = LocalDate.now();
        Parking parking = new Parking();
        parking.setName(name);
        parking.setZone(zone);
        parking.setLatitude(latitude);
        parking.setLongitude(longitude);
        parking.setTotalSpots(totalSpots);
        parking.setAvailableSpots(availableSpots);
        parking.setPricePerHour(new BigDecimal(pricePerHour));
        parking.setStatus(status);
        parking.setOpenTime(LocalDateTime.of(today, openTime));
        parking.setCloseTime(LocalDateTime.of(today, closeTime));
        parking.setPromotionRank(promotionRank);
        parking.setImageUrls(defaultImagesFor(name));
        parkingRepository.save(parking);
    }

    private void updateTieredPricing(
            ParkingRepository parkingRepository,
            String parkingName,
            String[][] tiers
    ) {
        parkingRepository.findWithPriceTiersByNameIgnoreCase(parkingName)
                .ifPresent(parking -> {
                    if (!parking.getPriceTiers().isEmpty()) {
                        return;
                    }

                    parking.getPriceTiers().clear();
                    for (int index = 0; index < tiers.length; index++) {
                        String[] tierSeed = tiers[index];
                        ParkingPriceTier tier = new ParkingPriceTier();
                        tier.setParking(parking);
                        tier.setFromHour(Integer.parseInt(tierSeed[0]));
                        tier.setToHour(Integer.parseInt(tierSeed[1]));
                        tier.setPrice(new BigDecimal(tierSeed[2]));
                        tier.setDisplayOrder(index);
                        parking.getPriceTiers().add(tier);
                    }
                    parking.setPricePerHour(new BigDecimal(tiers[0][2]));
                    parkingRepository.save(parking);
                });
    }

    private java.util.List<String> defaultImagesFor(String parkingName) {
        return switch (parkingName) {
            case "Blloku Central Parking" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
            );
            case "Qendra City Garage" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80"
            );
            case "Pazari i Ri Parking" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"
            );
            case "Liqeni View Parking" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80"
            );
            case "Komuna Premium Lot" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80"
            );
            case "21 Dhjetori Hub" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80"
            );
            case "Stadiumi Arena Parking" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&w=1200&q=80"
            );
            case "Myslym Shyri Smart Park" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80"
            );
            case "Don Bosko Easy Park" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80"
            );
            case "Medreseja Corner Parking" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1462396240927-52058a6a84ec?auto=format&fit=crop&w=1200&q=80"
            );
            case "TEG Long Stay Parking" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80"
            );
            case "Oxhaku Neighborhood Parking" -> java.util.List.of(
                    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80"
            );
            default -> java.util.List.of(
                    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80"
            );
        };
    }
}
