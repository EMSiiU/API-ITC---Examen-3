import { z } from 'zod';

const requiredText = z.string().trim().min(1);

const integerValue = z
    .union([
        z.number(),
        z.string().trim().regex(/^\d+$/).transform(Number),
    ])
    .pipe(z.number().int().nonnegative());

const classroomSchema = requiredText.nullable();

const timeRangeSchema = z
    .string()
    .trim()
    .regex(
        /^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/,
    )
    .refine(
        (value) => {
            const [startTime, endTime] = value.split('-');

            return startTime! < endTime!;
        },
        'The end time must be later than the start time.',
    )
    .transform((value) => {
        const [startTime, endTime] = value.split('-');

        return {
            startTime: startTime!,
            endTime: endTime!,
        };
    })
    .nullable();

const siiSubjectSchema = z.object({
    id_grupo: integerValue,
    letra_grupo: requiredText,
    nombre_materia: requiredText,
    clave_materia: requiredText,
    clave_turno: requiredText,
    nombre_plan: requiredText,
    letra_nivel: requiredText,

    lunes: timeRangeSchema,
    lunes_clave_salon: classroomSchema,
    martes: timeRangeSchema,
    martes_clave_salon: classroomSchema,
    miercoles: timeRangeSchema,
    miercoles_clave_salon: classroomSchema,
    jueves: timeRangeSchema,
    jueves_clave_salon: classroomSchema,
    viernes: timeRangeSchema,
    viernes_clave_salon: classroomSchema,
    sabado: timeRangeSchema,
    sabado_clave_salon: classroomSchema,
});

const siiScheduleSchema = z.object({
    code: z.literal(200),
    flag: z.literal(true),
    data: z.array(
        z.object({
            periodo: z.object({
                clave_periodo: requiredText,
                anio: integerValue,
                descripcion_periodo: requiredText,
            }),
            horario: z.array(siiSubjectSchema),
        }),
    ),
});

export type ScheduleDay = 1 | 2 | 3 | 4 | 5 | 6;

export type ScheduleSession = {
    day: ScheduleDay;
    startTime: string;
    endTime: string;
    classroom: string | null;
};

export type ScheduleSubject = {
    groupId: number;
    group: string;
    name: string;
    code: string;
    shiftCode: string;
    programName: string;
    levelCode: string;
    sessions: ScheduleSession[];
};

export type SchedulePeriod = {
    code: string;
    year: number;
    description: string;
    subjects: ScheduleSubject[];
};

export type StudentSchedule = {
    periods: SchedulePeriod[];
};

const dayFields = [
    { day: 1, time: 'lunes', classroom: 'lunes_clave_salon' },
    { day: 2, time: 'martes', classroom: 'martes_clave_salon' },
    { day: 3, time: 'miercoles', classroom: 'miercoles_clave_salon' },
    { day: 4, time: 'jueves', classroom: 'jueves_clave_salon' },
    { day: 5, time: 'viernes', classroom: 'viernes_clave_salon' },
    { day: 6, time: 'sabado', classroom: 'sabado_clave_salon' },
] as const;

type SiiScheduleSubject = z.infer<typeof siiSubjectSchema>;

function parseSessions(
    subject: SiiScheduleSubject,
): ScheduleSession[] {
    const sessions: ScheduleSession[] = [];

    for (const field of dayFields) {
        const time = subject[field.time];

        if (time === null) {
            continue;
        }

        sessions.push({
            day: field.day,
            startTime: time.startTime,
            endTime: time.endTime,
            classroom: subject[field.classroom],
        });
    }

    return sessions;
}

export function parseStudentSchedule(
    rawSchedule: unknown,
): StudentSchedule {
    const { data } = siiScheduleSchema.parse(rawSchedule);

    return {
        periods: data.map((period) => ({
            code: period.periodo.clave_periodo,
            year: period.periodo.anio,
            description: period.periodo.descripcion_periodo,
            subjects: period.horario.map((subject) => ({
                groupId: subject.id_grupo,
                group: subject.letra_grupo,
                name: subject.nombre_materia,
                code: subject.clave_materia,
                shiftCode: subject.clave_turno,
                programName: subject.nombre_plan,
                levelCode: subject.letra_nivel,
                sessions: parseSessions(subject),
            })),
        })),
    };
}