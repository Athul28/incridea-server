import { type AccommodationBookingStatus, type Gender } from "@prisma/client";

import { builder } from "~/graphql/builder";
import { checkIfAccommodationMember } from "~/graphql/models/UserInHotel/utils";

builder.mutationField("addAccommodationRequest", (t) =>
  t.prismaField({
    type: "UserInHotel",
    args: {
      gender: t.arg({ type: "String", required: true }),
      hotelId: t.arg({ type: "Int", required: true }),
      IdCard: t.arg({ type: "String", required: true }),
      checkIn: t.arg({ type: "DateTime", required: true }),
      checkOut: t.arg({ type: "DateTime", required: true }),
    },
    errors: {
      types: [Error],
    },
    resolve: async (query, root, args, ctx, info) => {
      const user = await ctx.user;
      if (!user) throw new Error("Not authenticated");

      const previouseRequest = await ctx.prisma.userInHotel.findFirst({
        where: {
          userId: user.id,
        },
      });

      if (previouseRequest)
        throw new Error("You already have an accommodation request");

      try {
        return await ctx.prisma.userInHotel.create({
          data: {
            User: {
              connect: {
                id: user.id,
              },
            },
            Hotel: {
              connect: {
                id: args.hotelId,
              },
            },
            gender: args.gender as Gender,
            checkIn: new Date(args.checkIn),
            checkOut: new Date(args.checkOut),
            IdCard: args.IdCard,
          },
          ...query,
        });
      } catch (e) {
        console.log(e);
        throw new Error(
          "Something went wrong! Couldn't create accommodation request",
        );
      }
    },
  }),
);

builder.mutationField("updateStatus", (t) =>
  t.prismaField({
    type: "UserInHotel",
    args: {
      bookingId: t.arg({ type: "String", required: true }),
      status: t.arg({ type: "String", required: true }),
      room: t.arg({ type: "String", required: true }),
      hotelId: t.arg({ type: "String", required: true }),
    },
    errors: {
      types: [Error],
    },
    resolve: async (query, root, args, ctx, info) => {
      const user = await ctx.user;
      if (!user) throw new Error("Not authenticated");

      const isAllowed =
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        checkIfAccommodationMember(user.id) || user.role === "ADMIN";
      if (!isAllowed) throw new Error("Not allowed to perform this action");

      try {
        return await ctx.prisma.userInHotel.update({
          where: {
            id: Number(args.bookingId),
          },
          data: {
            status: args.status as AccommodationBookingStatus,
            room: args.room,
            Hotel: {
              connect: {
                id: Number(args.hotelId),
              },
            },
          },
          ...query,
        });
      } catch (e) {
        console.log(e);
        throw new Error(
          "Something went wrong! Couldn't update accommodation request",
        );
      }
    },
  }),
);
