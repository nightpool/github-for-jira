import Sequelize from "sequelize";
import logger from "../config/logger";
import { EnvironmentEnum } from "../config/env";
import { getNodeEnv } from "../util/isNodeEnv";

const nodeEnv = getNodeEnv() || EnvironmentEnum.development;
// TODO: config misses timezone config to force to UTC, defaults to local timezone of PST
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require("../../db/config.json")[nodeEnv];

config.benchmark = true;
config.logging = config.disable_sql_logging
	? undefined
	: (query, ms) => logger.trace({ ms }, query);

logger.warn({}, `bgvozdev testing ` + JSON.stringify(process.env[config.use_env_variable]) + ' ' + process.env.DATABASE_URL)

export const sequelize = config.use_env_variable
	? new Sequelize.Sequelize(process.env[config.use_env_variable], config)
	: new Sequelize.Sequelize(config);
