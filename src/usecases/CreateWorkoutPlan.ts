import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

interface CreateWorkoutPlanDto {
  userId: string;
  name: string;
  workoutDays: Array<{
    name: string;
    weekDay: WeekDay;
    isRest: boolean;
    estimatedDurationInSeconds: number;
    exercises: Array<{
      order: number;
      name: string;
      targetSets: number;
      targetReps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

export class CreateWorkoutPlan {
  async execute(Dto: CreateWorkoutPlanDto) {
    const workoutPlanExists = await prisma.workoutPlan.findFirst({
      where: {
        isActive: true,
      },
    });

    return prisma.$transaction(async (tx) => {
      if (workoutPlanExists) {
        await tx.workoutPlan.update({
          where: {
            id: workoutPlanExists.id,
          },
          data: {
            isActive: false,
          },
        });
      }

      const workoutPlan = await tx.workoutPlan.create({
        data: {
          name: Dto.name,
          userId: Dto.userId,
          isActive: true,
          workoutDays: {
            create: Dto.workoutDays.map((WorkoutDay) => ({
              name: WorkoutDay.name,
              weekDay: WorkoutDay.weekDay,
              isRest: WorkoutDay.isRest,
              estimatedDurationInSeconds: WorkoutDay.estimatedDurationInSeconds,
              exercises: {
                create: WorkoutDay.exercises.map((Exercise) => ({
                  name: Exercise.name,
                  order: Exercise.order,
                  targetSets: Exercise.targetSets,
                  targetReps: Exercise.targetReps,
                  restTimeInSeconds: Exercise.restTimeInSeconds,
                })),
              },
            })),
          },
        },
      });

      const result = await tx.workoutPlan.findUnique({
        where: {
          id: workoutPlan.id,
        },
        include: {
          workoutDays: {
            include: {
              exercises: true,
            },
          },
        },
      });

      if (!result) {
        throw new NotFoundError("Failed to retrieve the created workout plan");
      }

      return result;
    });
  }
}
