import { z } from 'zod';

const textValue = z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const numericValue = z
    .union([
        z.number(),
        z.string().trim().regex(/^-?\d+(?:\.\d+)?$/).transform(Number),
    ])
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const siiProfileSchema = z
    .object({
        code: z.literal(200),
        flag: z.union([z.literal(true), z.literal('success')]),
        data: z
        .object({
            numero_control: z.string().trim().min(1),
            email: textValue,
            semestre: numericValue,
            creditos_acumulados: numericValue,
            promedio_ponderado: numericValue,
            promedio_aritmetico: numericValue,
            materias_cursadas: numericValue,
            materias_reprobadas: numericValue,
            materias_aprobadas: numericValue,
            creditos_complementarios: numericValue,
            porcentaje_avance: numericValue,
            num_mat_rep_no_acreditadas: numericValue,
            num_materias_rep_primera: numericValue,
            num_materias_rep_segunda: numericValue,
            percentaje_avance_cursando: numericValue,
            foto: textValue,
        })
        .passthrough(),
    })
    .passthrough();

export type StudentProfile = {
    controlNumber: string | null;
    email: string | null;
    semester: number | null;
    photoUrl: string | null;
    academicProgress: {
        accumulatedCredits: number | null;
        complementaryCredits: number | null;
        progressPercentage: number | null;
        progressWhileEnrolledPercentage: number | null;
    };
    averages: {
        weighted: number | null;
        arithmetic: number | null;
    };
    subjects: {
        taken: number | null;
        passed: number | null;
        failed: number | null;
        failedNotAccredited: number | null;
        failedFirstAttempt: number | null;
        failedSecondAttempt: number | null;
    };
};

export function parseStudentProfile(rawProfile: unknown): StudentProfile {
    const { data } = siiProfileSchema.parse(rawProfile);

    return {
        controlNumber: data.numero_control,
        email: data.email,
        semester: data.semestre,
        photoUrl: data.foto,
        academicProgress: {
        accumulatedCredits: data.creditos_acumulados,
        complementaryCredits: data.creditos_complementarios,
        progressPercentage: data.porcentaje_avance,
        progressWhileEnrolledPercentage: data.percentaje_avance_cursando,
        },
        averages: {
        weighted: data.promedio_ponderado,
        arithmetic: data.promedio_aritmetico,
        },
        subjects: {
        taken: data.materias_cursadas,
        passed: data.materias_aprobadas,
        failed: data.materias_reprobadas,
        failedNotAccredited: data.num_mat_rep_no_acreditadas,
        failedFirstAttempt: data.num_materias_rep_primera,
        failedSecondAttempt: data.num_materias_rep_segunda,
        },
    };
}
