import { z } from "zod";
import { PARTICIPANT_MODES } from "../constants/courseTemplate.constants";

// Helpers

const trimmedString = (max = 3000) =>
    z.string()
      .trim()
      .max(max)
      .or(z.literal(""))
      .nullable()   
      .default("")
      .transform(val => val === "" ? undefined : val);

  const optionalUrlString = () =>
    z.string()
      .url("URL no válida")
      .or(z.literal(""))
      .nullable()  
      .optional()
      .default("")
      .transform(val => val === "" ? undefined : val);

//Subschemas
export const priceConditionSchema = z
  .object({
    participantMode: z.enum(PARTICIPANT_MODES).optional(),
  })
      

//Base courseTemplate Schema


//Create Schema
// export const createCourseTemplateSchema = z
    

//Update Schema


//Internal / DB schema

//Types inferidos