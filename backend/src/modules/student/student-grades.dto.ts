// Valida la estructura y devuelve periods, con las materias y evaluaciones de cada período

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

const integerValue = nonNegativeNumber.pipe(z.number().int());

const gradeLabelSchema = z
    .union([
        z.number().finite(),
        requiredText,
    ])
    .nullable()
    .transform((value) => (
        value === null ? null : String(value)
    ));

const siiGradesSchema = z.object({
    code: z.literal(200),
    flag: z.literal(true),
    data: z.array(
        z.object({
            periodo: z.object({
                clave_periodo: requiredText,
                anio: integerValue,
                descripcion_periodo: requiredText,
            }),
            materias: z.array(
                z.object({
                    materia: z.object({
                        id_grupo: integerValue,
                        nombre_materia: requiredText,
                        clave_materia: requiredText,
                        letra_grupo: requiredText,
                    }),
                    calificaiones: z.array(
                        z.object({
                            id_calificacion: integerValue,
                            numero_calificacion: integerValue,
                            calificacion: gradeLabelSchema,
                        }),
                    ),
                }),
            ),
        }),
    ),
});

export type StudentAssessment = {
    id: number;
    number: number;
    grade: number | null;
    gradeLabel: string | null;
};

export type StudentGradesSubject = {
    groupId: number;
    name: string;
    code: string;
    group: string;
    assessments: StudentAssessment[];
};

export type StudentGradesPeriod = {
    code: string;
    year: number;
    description: string;
    subjects: StudentGradesSubject[];
};

export type StudentGrades = {
    periods: StudentGradesPeriod[];
};

function toNumericGrade(label: string | null): number | null {
    if (label === null || !/^\d+(?:\.\d+)?$/.test(label)) {
        return null;
    }

    const value = Number(label);

    return Number.isFinite(value) ? value : null;
}

export function parseStudentGrades(
    rawGrades: unknown,
): StudentGrades {
    const { data } = siiGradesSchema.parse(rawGrades);

    return {
        periods: data.map((period) => ({
            code: period.periodo.clave_periodo,
            year: period.periodo.anio,
            description: period.periodo.descripcion_periodo,
            subjects: period.materias.map((subject) => ({
                groupId: subject.materia.id_grupo,
                name: subject.materia.nombre_materia,
                code: subject.materia.clave_materia,
                group: subject.materia.letra_grupo,
                assessments: subject.calificaiones.map(
                    (assessment) => ({
                        id: assessment.id_calificacion,
                        number: assessment.numero_calificacion,
                        grade: toNumericGrade(
                            assessment.calificacion,
                        ),
                        gradeLabel: assessment.calificacion,
                    }),
                ),
            })),
        })),
    };
}