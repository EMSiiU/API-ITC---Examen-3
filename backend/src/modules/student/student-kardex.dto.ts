// validar la respuesta externa y traducirla al contrato de nuestra aplicacion
import { z } from 'zod';

const requiredText = z.string().trim().min(1);

const nonNegativeNumber = z
    .union([
        z.number(),
        z.string()
            .trim()
            .regex(/^\d+(?:\.\d+)?$/)
            .transform(Number),
    ])
    .pipe(z.number().finite().nonnegative());

const gradeLabelSchema = z
    .union([
        z.number().finite(),
        requiredText,
    ])
    .transform((value) => String(value));

const siiKardexSchema = z.object({
    code: z.literal(200),
    flag: z.literal(true),
    data: z.object({
        porcentaje_avance: nonNegativeNumber,
        kardex: z.array(
            z.object({
                nombre_materia: requiredText,
                clave_materia: requiredText,
                periodo: requiredText,
                creditos: nonNegativeNumber,
                calificacion: gradeLabelSchema,
                descripcion: requiredText,
                semestre: nonNegativeNumber.pipe(
                    z.number().int(),
                ),
            }),
        ),
    }),
});

export type KardexSubject = {
    name: string;
    code: string;
    period: string;
    credits: number;
    grade: number | null;
    gradeLabel: string;
    evaluationDescription: string;
    semester: number;
};

export type StudentKardex = {
    progressPercentage: number;
    subjects: KardexSubject[];
};

function toNumericGrade(label: string): number | null {
    if (!/^\d+(?:\.\d+)?$/.test(label)) {
        return null;
    }

    const value = Number(label);

    return Number.isFinite(value) ? value : null;
}

export function parseStudentKardex(
    rawKardex: unknown,
): StudentKardex {
    const { data } = siiKardexSchema.parse(rawKardex);

    return {
        progressPercentage: data.porcentaje_avance,
        subjects: data.kardex.map((subject) => ({
            name: subject.nombre_materia,
            code: subject.clave_materia,
            period: subject.periodo,
            credits: subject.creditos,
            grade: toNumericGrade(subject.calificacion),
            gradeLabel: subject.calificacion,
            evaluationDescription: subject.descripcion,
            semester: subject.semestre,
        })),
    };
}