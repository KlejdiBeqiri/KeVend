import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import colors from "@/constants/colors";
import fonts from "@/constants/fonts";
import { useI18n } from "@/i18n/I18nProvider";
import ReservingModal from "@/screens/reservations/ReservingModal";
import { fetchParkingById, ParkingLot, ParkingPriceTier } from "@/services/parkingService";
import { fetchMyProfile } from "@/services/profileService";
import { fetchMyHistory } from "@/services/reservationService";
import {
  createReview,
  deleteReview,
  fetchParkingReviews,
  ParkingReviewSummary,
} from "@/services/reviewService";

const GALLERY_IMAGE_WIDTH = Dimensions.get("window").width - 40;

const formatHours = (parking: ParkingLot, open247Label: string) => {
  if (!parking.openTime || !parking.closeTime) {
    return open247Label;
  }

  return `${parking.openTime.substring(11, 16)} - ${parking.closeTime.substring(11, 16)}`;
};

const getPriceRows = (parking: ParkingLot, hourLabel: string) => {
  if (parking.priceTiers.length > 0) {
    return parking.priceTiers.map((tier) => ({
      label: `${tier.fromHour}-${tier.toHour} ${hourLabel}`,
      price: `${tier.price} ALL`,
    }));
  }

  const base = Number(parking.pricePerHour);
  return [
    { label: `1 ${hourLabel}`, price: `${base} ALL` },
    { label: `2 ${hourLabel}`, price: `${base * 2} ALL` },
    { label: `4 ${hourLabel}`, price: `${base * 4} ALL` },
  ];
};

const getStartingPrice = (parking: ParkingLot) =>
  parking.priceTiers.length > 0 ? Number(parking.priceTiers[0].price) : Number(parking.pricePerHour);

const getStatusInfo = (
  parking: ParkingLot,
  labels: { closed: string; full: string; limited: string; open: string }
) => {
  if (parking.status === "CLOSED") {
    return { label: labels.closed, color: "#64748B" };
  }
  if (parking.availableSpots === 0 || parking.status === "FULL") {
    return { label: labels.full, color: "#EF4444" };
  }
  if (parking.availableSpots <= 10) {
    return { label: labels.limited, color: "#F59E0B" };
  }
  return { label: labels.open, color: "#22C55E" };
};

const getTierDescription = (
  tiers: ParkingPriceTier[],
  labels: { simple: string; flat: string; tiered: string }
) => {
  if (tiers.length === 0) {
    return labels.simple;
  }

  if (tiers.length === 1) {
    return labels.flat;
  }

  return labels.tiered;
};

const openGoogleMapsRoute = async (parking: ParkingLot) => {
  const destination = `${parking.latitude},${parking.longitude}`;
  const nativeGoogleMapsUrl =
    Platform.OS === "ios"
      ? `comgooglemaps://?daddr=${destination}&directionsmode=driving`
      : `google.navigation:q=${destination}&mode=d`;
  const browserFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

  const canOpenNative = await Linking.canOpenURL(nativeGoogleMapsUrl);
  await Linking.openURL(canOpenNative ? nativeGoogleMapsUrl : browserFallbackUrl);
};

function formatReviewDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString();
}

function renderStars(rating: number, size = 14) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Ionicons
          key={`${rating}-${index}`}
          name={index < rating ? "star" : "star-outline"}
          size={size}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

export default function ParkingDetailScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams();
  const parkingId = params.parkingId ? Number(params.parkingId) : null;

  const [parking, setParking] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState<ParkingReviewSummary>({
    count: 0,
    averageRating: null,
    reviews: [],
  });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewPromptError, setReviewPromptError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserSurname, setCurrentUserSurname] = useState<string | null>(null);
  const reviewInputRef = useRef<TextInput | null>(null);

  const loadReviews = async (targetParkingId: number) => {
    try {
      setLoadingReviews(true);
      const summary = await fetchParkingReviews(targetParkingId);
      setReviewsSummary(summary);
    } catch (fetchError) {
      console.warn("Failed to fetch parking reviews", fetchError);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (!parkingId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [parkingData, reviewData] = await Promise.all([
          fetchParkingById(parkingId),
          fetchParkingReviews(parkingId),
        ]);
        if (!cancelled) {
          setParking(parkingData);
          setReviewsSummary(reviewData);
        }
        fetchMyProfile()
          .then((profile) => {
            if (!cancelled) {
              setCurrentUserId(profile.id);
              setCurrentUserName(profile.name);
              setCurrentUserSurname(profile.surname);
            }
          })
          .catch(() => null);
      } catch (fetchError) {
        if (!cancelled) {
          setError(t("parking.loadError"));
        }
        console.warn("Failed to fetch parking", fetchError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parkingId, t]);

  const statusInfo = parking
    ? getStatusInfo(parking, {
        closed: t("parking.closed"),
        full: t("parking.full"),
        limited: t("parking.limited"),
        open: t("parking.open"),
      })
    : null;
  const priceRows = useMemo(
    () => (parking ? getPriceRows(parking, t("parking.hour")) : []),
    [parking, t]
  );

  const handleSubmitReview = async () => {
    if (!parkingId) {
      return;
    }

    if (reviewRating < 1) {
      setReviewError(t("parking.reviewRatingRequired"));
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError(null);

      const history = await fetchMyHistory();
      const eligibleReservation = history
        .filter((item) => item.parkingId === parkingId && item.status === "COMPLETED")
        .sort((left, right) => {
          const leftTime = left.endTime ? new Date(left.endTime).getTime() : 0;
          const rightTime = right.endTime ? new Date(right.endTime).getTime() : 0;
          return rightTime - leftTime;
        })[0];

      if (!eligibleReservation) {
        setReviewError(t("parking.reviewEligibility"));
        return;
      }

      await createReview({
        reservationId: eligibleReservation.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      const optimisticCreatedAt = new Date().toISOString();
      const optimisticComment = reviewComment.trim();
      setReviewsSummary((current) => {
        const nextCount = current.count + 1;
        const nextAverage =
          ((current.averageRating ?? 0) * current.count + reviewRating) / nextCount;

        return {
          count: nextCount,
          averageRating: Math.round(nextAverage * 10) / 10,
          reviews: [
            {
              userId: currentUserId,
              reviewerName: currentUserName,
              reviewerSurname: currentUserSurname,
              reviewId: Date.now(),
              rating: reviewRating,
              comment: optimisticComment,
              createdAt: optimisticCreatedAt,
            },
            ...current.reviews,
          ],
        };
      });

      Keyboard.dismiss();
      setReviewModalVisible(false);
      setReviewRating(0);
      setReviewComment("");
      void loadReviews(parkingId);
    } catch (submitError: any) {
      const backendMessage = submitError?.response?.data?.message;
      setReviewError(backendMessage ?? t("parking.reviewSubmitError"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenReviewModal = async () => {
    if (!parkingId) {
      return;
    }

    setReviewPromptError(null);

    try {
      const history = await fetchMyHistory();
      const eligibleReservation = history.some(
        (item) => item.parkingId === parkingId && item.status === "COMPLETED"
      );

      if (!eligibleReservation) {
        setReviewPromptError(t("parking.reviewEligibility"));
        return;
      }

      setReviewError(null);
      setReviewModalVisible(true);
    } catch {
      setReviewPromptError(t("parking.reviewEligibility"));
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!parkingId) {
      return;
    }

    try {
      await deleteReview(reviewId);
      await loadReviews(parkingId);
    } catch (deleteError: any) {
      const backendMessage = deleteError?.response?.data?.message;
      setReviewError(backendMessage ?? t("parking.reviewDeleteError"));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0B8BFF" />
      </SafeAreaView>
    );
  }

  if (error || !parking) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error ?? t("parking.notFound")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={["#192536", "#0F1725", "#0A0F19"]} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable style={styles.heroBackButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={styles.heroSpacer} />
          </View>

          {parking.imageUrls.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryRow}
            >
              {parking.imageUrls.slice(0, 3).map((imageUrl, index) => (
                <Image key={`${imageUrl}-${index}`} source={{ uri: imageUrl }} style={styles.galleryImage} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.heroMedia}>
              <View style={styles.mediaGlow} />
              <MaterialCommunityIcons name="parking" size={76} color="#DDE9FF" />
            </View>
          )}

          <View style={styles.heroContent}>
            <View style={styles.heroTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{parking.name}</Text>
                <Text style={styles.zone}>{parking.zone ?? t("map.tirana")}</Text>
              </View>

              {statusInfo ? (
                <View style={[styles.statusPill, { backgroundColor: `${statusInfo.color}22` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.heroMetrics}>
              <View style={styles.metricCard}>
                <Ionicons name="car-sport-outline" size={18} color="#7DD3FC" />
                <Text style={styles.metricValue}>{parking.availableSpots}</Text>
                <Text style={styles.metricLabel}>{t("parking.freeSpots")}</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="cash-outline" size={18} color="#FDE68A" />
                <Text style={styles.metricValue}>{getStartingPrice(parking)} ALL</Text>
                <Text style={styles.metricLabel}>
                  {parking.priceTiers.length > 0 ? t("parking.startingPrice") : t("parking.perHour")}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="time-outline" size={18} color="#86EFAC" />
                <Text style={styles.metricValue}>{formatHours(parking, t("parking.open247"))}</Text>
                <Text style={styles.metricLabel}>{t("parking.schedule")}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("parking.whyWorks")}</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Ionicons name="navigate-outline" size={18} color="#0B8BFF" />
              <Text style={styles.featureTitle}>{t("parking.goodLocation")}</Text>
              <Text style={styles.featureText}>
                {t("parking.goodLocationText", { zone: parking.zone ?? t("map.tirana") })}
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#22C55E" />
              <Text style={styles.featureTitle}>{t("parking.liveAvailability")}</Text>
              <Text style={styles.featureText}>
                {t("parking.liveAvailabilityText", {
                  available: parking.availableSpots,
                  total: parking.totalSpots,
                })}
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Ionicons name="pricetag-outline" size={18} color="#F59E0B" />
              <Text style={styles.featureTitle}>{t("parking.pricingStyle")}</Text>
              <Text style={styles.featureText}>
                {getTierDescription(parking.priceTiers, {
                  simple: t("parking.simpleRate"),
                  flat: t("parking.flatRate"),
                  tiered: t("parking.tieredRate"),
                })}
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Ionicons name="time-outline" size={18} color="#A78BFA" />
              <Text style={styles.featureTitle}>{t("parking.parkingHours")}</Text>
              <Text style={styles.featureText}>{formatHours(parking, t("parking.open247"))}</Text>
            </View>
          </View>

          <Pressable style={styles.routeButton} onPress={() => openGoogleMapsRoute(parking)}>
            <Ionicons name="navigate-circle-outline" size={18} color="#08111C" />
            <Text style={styles.routeButtonText}>{t("common.openInGoogleMaps")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#08111C" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{t("parking.pricing")}</Text>
              <Text style={styles.sectionSubtitle}>
                {parking.priceTiers.length > 0
                  ? t("parking.pricingTieredText")
                  : t("parking.pricingFlatText")}
              </Text>
            </View>
            <View style={styles.priceStyleBadge}>
              <Text style={styles.priceStyleText}>
                {parking.priceTiers.length > 0 ? t("parking.tiered") : t("parking.flat")}
              </Text>
            </View>
          </View>

          <View style={styles.pricingCard}>
            {priceRows.map((row, index) => (
              <View
                key={`${row.label}-${index}`}
                style={[styles.priceRow, index < priceRows.length - 1 && styles.priceRowBorder]}
              >
                <View>
                  <Text style={styles.priceLabel}>{row.label}</Text>
                  <Text style={styles.priceHint}>
                    {index === 0 ? t("parking.bestEntry") : t("parking.durationRange")}
                  </Text>
                </View>
                <Text style={styles.priceValue}>{row.price}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <View>
              <Text style={styles.sectionTitle}>{t("parking.reviewsTitle")}</Text>
            </View>
            <Pressable style={styles.reviewButton} onPress={handleOpenReviewModal}>
              <Ionicons name="star-outline" size={16} color="#08111C" />
              <Text style={styles.reviewButtonText}>{t("parking.addReview")}</Text>
            </Pressable>
          </View>
          {reviewPromptError ? <Text style={styles.reviewPromptError}>{reviewPromptError}</Text> : null}

          <View style={styles.reviewStatsCard}>
            <View>
              <Text style={styles.reviewAverage}>
                {reviewsSummary.averageRating?.toFixed(1) ?? "0.0"}
              </Text>
              {renderStars(Math.round(reviewsSummary.averageRating ?? 0), 16)}
            </View>
            <Text style={styles.reviewCount}>
              {t("parking.reviewCount", { count: reviewsSummary.count })}
            </Text>
          </View>

          {loadingReviews ? (
            <ActivityIndicator color="#0B8BFF" style={styles.loadingReviews} />
          ) : reviewsSummary.reviews.length > 0 ? (
            <View style={styles.reviewList}>
              {reviewsSummary.reviews.map((review, index) => (
                <View key={`${review.createdAt}-${index}`} style={styles.reviewCard}>
                  <View style={styles.reviewTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewAuthor}>
                        {[review.reviewerName, review.reviewerSurname].filter(Boolean).join(" ") ||
                          t("parking.anonymousReviewer")}
                      </Text>
                      <Text style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Text>
                    </View>
                    <View style={styles.reviewActions}>
                      {renderStars(review.rating)}
                      {currentUserId != null && review.userId === currentUserId ? (
                        <Pressable
                          style={styles.deleteReviewButton}
                          onPress={() => handleDeleteReview(review.reviewId)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#FCA5A5" />
                          <Text style={styles.deleteReviewText}>{t("common.delete")}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>
                    {review.comment?.trim() || t("parking.reviewNoComment")}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyReviewCard}>
              <Text style={styles.emptyReviewTitle}>{t("parking.noReviewsYet")}</Text>
              <Text style={styles.emptyReviewText}>{t("parking.noReviewsYetText")}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <View>
          <Text style={styles.ctaTopLabel}>{t("parking.startingFrom")}</Text>
          <Text style={styles.ctaPrice}>{getStartingPrice(parking)} ALL</Text>
        </View>

        <Pressable style={styles.reserveButton} onPress={() => setModalVisible(true)}>
          <LinearGradient
            colors={["#3080FF", "#00358B", "#00358B", "#3080FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.reserveGradient}
          >
            <Text style={styles.reserveText}>{t("parking.reserveSpot")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      <ReservingModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        parkingId={parkingId ?? undefined}
        parking={parking}
      />

      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            reviewInputRef.current?.blur();
            Keyboard.dismiss();
          }}
        >
          <Pressable style={styles.reviewModal} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderSpacer} />
              <Text style={styles.modalTitle}>{t("parking.addReview")}</Text>
              <Pressable onPress={() => setReviewModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color="#0F172A" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>{t("parking.reviewModalSubtitle")}</Text>

            <View style={styles.ratingPicker}>
              {Array.from({ length: 5 }).map((_, index) => {
                const starValue = index + 1;
                return (
                  <Pressable key={starValue} onPress={() => setReviewRating(starValue)}>
                    <Ionicons
                      name={starValue <= reviewRating ? "star" : "star-outline"}
                      size={28}
                      color="#F59E0B"
                    />
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              ref={reviewInputRef}
              style={styles.reviewInput}
              multiline
              blurOnSubmit
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              placeholder={t("parking.reviewCommentPlaceholder")}
              placeholderTextColor="#94A3B8"
              value={reviewComment}
              onChangeText={setReviewComment}
              onSubmitEditing={Keyboard.dismiss}
            />

            {reviewError ? <Text style={styles.reviewError}>{reviewError}</Text> : null}

            <Pressable
              style={[styles.submitReviewButton, reviewSubmitting && styles.disabledButton]}
              onPress={handleSubmitReview}
              disabled={reviewSubmitting}
            >
              <Text style={styles.submitReviewText}>
                {reviewSubmitting ? t("reservation.saving") : t("parking.submitReview")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08111C",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#F8FAFF",
    fontSize: 15,
    fontFamily: fonts.interRegular,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroSpacer: {
    width: 40,
    height: 40,
  },
  galleryRow: {
    gap: 12,
    paddingTop: 18,
  },
  galleryImage: {
    width: GALLERY_IMAGE_WIDTH,
    height: 210,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  heroMedia: {
    marginTop: 18,
    height: 210,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mediaGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(48,128,255,0.18)",
  },
  heroContent: {
    marginTop: 20,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontFamily: fonts.interSemiBold,
  },
  zone: {
    marginTop: 6,
    color: "#A7B4C6",
    fontSize: 15,
    fontFamily: fonts.interRegular,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.interSemiBold,
  },
  heroMetrics: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 14,
  },
  metricValue: {
    marginTop: 10,
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },
  metricLabel: {
    marginTop: 4,
    color: "#A7B4C6",
    fontSize: 12,
    fontFamily: fonts.interRegular,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.interSemiBold,
  },
  sectionSubtitle: {
    marginTop: 4,
    color: "#8FA1B9",
    fontSize: 13,
    fontFamily: fonts.interRegular,
  },
  featureGrid: {
    marginTop: 16,
    gap: 12,
  },
  featureCard: {
    backgroundColor: "#101B2A",
    borderRadius: 22,
    padding: 16,
  },
  featureTitle: {
    marginTop: 10,
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },
  featureText: {
    marginTop: 6,
    color: "#91A2B8",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.interRegular,
  },
  routeButton: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#D7E7FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  routeButtonText: {
    color: "#08111C",
    fontSize: 14,
    fontFamily: fonts.interSemiBold,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  priceStyleBadge: {
    backgroundColor: "rgba(48,128,255,0.16)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceStyleText: {
    color: "#90C2FF",
    fontSize: 12,
    fontFamily: fonts.interSemiBold,
  },
  pricingCard: {
    marginTop: 16,
    backgroundColor: "#101B2A",
    borderRadius: 24,
    overflow: "hidden",
  },
  priceRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  priceRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  priceLabel: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },
  priceHint: {
    marginTop: 4,
    color: "#89A0BC",
    fontSize: 12,
    fontFamily: fonts.interRegular,
  },
  priceValue: {
    color: "#7DD3FC",
    fontSize: 16,
    fontFamily: fonts.interSemiBold,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  reviewButton: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: "#D7E7FF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  reviewButtonText: {
    color: "#08111C",
    fontSize: 13,
    fontFamily: fonts.interSemiBold,
  },
  reviewPromptError: {
    marginTop: 12,
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.interRegular,
  },
  reviewStatsCard: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "#101B2A",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  reviewAverage: {
    color: "#FFFFFF",
    fontSize: 30,
    fontFamily: fonts.interSemiBold,
  },
  reviewCount: {
    color: "#A7B4C6",
    fontSize: 13,
    fontFamily: fonts.interRegular,
  },
  loadingReviews: {
    marginTop: 18,
  },
  reviewList: {
    marginTop: 14,
    gap: 12,
  },
  reviewCard: {
    borderRadius: 22,
    backgroundColor: "#101B2A",
    padding: 16,
  },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  reviewActions: {
    alignItems: "flex-end",
    gap: 10,
  },
  reviewAuthor: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },
  reviewDate: {
    marginTop: 4,
    color: "#8FA1B9",
    fontSize: 12,
    fontFamily: fonts.interRegular,
  },
  reviewComment: {
    marginTop: 10,
    color: "#D7DFEA",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.interRegular,
  },
  emptyReviewCard: {
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: "#101B2A",
    padding: 18,
  },
  emptyReviewTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },
  emptyReviewText: {
    marginTop: 6,
    color: "#8FA1B9",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.interRegular,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    borderRadius: 26,
    backgroundColor: "rgba(9,15,24,0.96)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaTopLabel: {
    color: "#91A2B8",
    fontSize: 11,
    fontFamily: fonts.interRegular,
  },
  ctaPrice: {
    marginTop: 4,
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.interSemiBold,
  },
  reserveButton: {
    borderRadius: 22,
    overflow: "hidden",
  },
  reserveGradient: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 22,
  },
  reserveText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  reviewModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalHeaderSpacer: {
    width: 34,
    height: 34,
  },
  modalTitle: {
    flex: 1,
    color: "#0F172A",
    fontSize: 20,
    fontFamily: fonts.interSemiBold,
    textAlign: "center",
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitle: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.interRegular,
  },
  ratingPicker: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  reviewInput: {
    marginTop: 18,
    minHeight: 110,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D7E0EC",
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#0F172A",
    textAlignVertical: "top",
    fontFamily: fonts.interRegular,
  },
  reviewError: {
    marginTop: 12,
    color: "#DC2626",
    fontSize: 13,
    fontFamily: fonts.interRegular,
  },
  deleteReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteReviewText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontFamily: fonts.interSemiBold,
  },
  submitReviewButton: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#0B8BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitReviewText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: fonts.interSemiBold,
  },
});
