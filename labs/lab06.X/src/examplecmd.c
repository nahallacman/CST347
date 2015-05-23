/* Note: To use the VTaskList Command you must modify the FreeRTOSConfig.h
 * to change #define configUSE_TRACE_FACILITY	0 to be a 1 */
/*
static const char taskListHdr[] = "Name\t\tStat\tPri\tS/Space\tTCB";

static const xCommandLineInput xTaskStatsCommand = {"task-stats",
            "task-stats: Displays a table of task state information\r\n",
            prvTaskStatsCommand,
            0};

portBASE_TYPE prvTaskStatsCommand(int8_t *pcWriteBuffer, 
                                  size_t xWriteBufferLen,
                                  const int8_t *pcCommandString)
{
    sprintf(pcWriteBuffer, taskListHdr);
    pcWriteBuffer += strlen(taskListHdr);
    vTaskList(pcWriteBuffer);

    return pdFALSE;
}
*/