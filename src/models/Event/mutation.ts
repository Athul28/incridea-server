import { type } from "os";
import { builder } from "../../builder";

const EventCreateInput = builder.inputType("EventCreateInput", {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: false }),
    eventDate: t.field({
      type: "Date",
      required: false,
    }),
    venue: t.string({ required: false }),
  }),
});
const EventUpdateInput = builder.inputType("EventUpdateInput", {
  fields: (t) => ({
    name: t.string({ required: false }),
    description: t.string({ required: false }),
    eventDate: t.field({
      type: "Date",
      required: false,
    }),
    venue: t.string({ required: false }),
  }),
});

builder.mutationField("createEvent", (t) =>
  t.prismaField({
    type: "Event",
    args: {
      data: t.arg({
        type: EventCreateInput,
        required: true,
      }),
    },
    errors: {
      types: [Error],
    },
    resolve: async (query, root, args, ctx, info) => {
      const user = await ctx.user;
      console.log(user);
      if (!user) throw new Error("Not authenticated");
      if (user.role !== "BRANCH_REP") throw new Error("No Permission");
      const branch = await ctx.prisma.branchRep.findUnique({
        where: {
          userId: user.id,
        },
      });
      if (!branch) throw new Error(`No Branch Under ${user.name}`);
      return ctx.prisma.event.create({
        data: {
          ...args.data,
          Branch: {
            connect: {
              id: branch.branchId,
            },
          },
        },
      });
    },
  })
);

builder.mutationField("updateEvent", (t) =>
  t.prismaField({
    type: "Event",
    args: {
      id: t.arg({ type: "Int", required: true }),
      data: t.arg({
        type: EventUpdateInput,
        required: true,
      }),
    },
    errors: {
      types: [Error],
    },
    resolve: async (query, root, args, ctx, info) => {
      const user = await ctx.user;
      if (!user) throw new Error("Not authenticated");
      if (user.role !== "BRANCH_REP" && user.role !== "ORGANIZER")
        throw new Error("No Permission");
      const event = await ctx.prisma.event.findUnique({
        where: {
          id: args.id,
        },
      });
      if (!event) throw new Error(`No Event with id ${args.id}`);
      if (user.role === "BRANCH_REP") {
        const branchRep = await ctx.prisma.branchRep.findUnique({
          where: {
            userId: user.id,
          },
        });
        if (!branchRep) throw new Error(`No Branch Under ${user.name}`);

        if (event.branchId !== branchRep.branchId)
          throw new Error(`You are not authorized to update this event`);
      }
      if (user.role === "ORGANIZER") {
        const organizer = await ctx.prisma.organizer.findUnique({
          where: {
            userId_eventId: {
              userId: user.id,
              eventId: args.id,
            },
          },
        });
        if (!organizer)
          throw new Error(
            `Oops ${user.name}! you are not an organizer of this event`
          );
      }

      return ctx.prisma.event.update({
        where: {
          id: args.id,
        },

        data: {
          ...args.data,
          name: args.data.name || event.name,
        },
        ...query,
      });
    },
  })
);

builder.mutationField("deleteEvent", (t) =>
  t.field({
    type: "String",
    args: {
      id: t.arg({ type: "Int", required: true }),
    },
    errors: {
      types: [Error],
    },
    resolve: async (root, args, ctx) => {
      const user = await ctx.user;
      if (!user) throw new Error("Not authenticated");
      if (user.role !== "BRANCH_REP" && user.role !== "ORGANIZER")
        throw new Error("No Permission");
      const event = await ctx.prisma.event.findUnique({
        where: {
          id: args.id,
        },
      });
      if (!event) throw new Error(`No Event with id ${args.id}`);
      if (user.role === "BRANCH_REP") {
        const branchRep = await ctx.prisma.branchRep.findUnique({
          where: {
            userId: user.id,
          },
        });
        if (!branchRep) throw new Error(`No Branch Under ${user.name}`);

        if (event.branchId !== branchRep.branchId)
          throw new Error(`You are not authorized to delete this event`);
      }
      if (user.role === "ORGANIZER") {
        const organizer = await ctx.prisma.organizer.findUnique({
          where: {
            userId_eventId: {
              userId: user.id,
              eventId: args.id,
            },
          },
        });
        if (!organizer)
          throw new Error(
            `Oops ${user.name}! you are not an organizer of this event`
          );
      }
      await ctx.prisma.event.delete({
        where: {
          id: args.id,
        },
      });
      return "Event Deleted Successfully";
    },
  })
);