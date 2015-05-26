/* Note: To use the VTaskList Command you must modify the FreeRTOSConfig.h
 * to change #define configUSE_TRACE_FACILITY	0 to be a 1 */

#include "FreeRTOS.h"

#include "../../FreeRTOS-Plus-CLI/FreeRTOS_CLI.h"
#include "task.h"

#include "myCLICMD.h"

static const char taskListHdr[] = "Name\t\tStat\tPri\tSpace\tTCB\r\n";



/* This function implements the behaviour of a command, so must have the correct
prototype. */
static portBASE_TYPE prvTaskStatsCommand( int8_t *pcWriteBuffer,
 size_t xWriteBufferLen,
const int8_t *pcCommandString )
{
 /* For simplicity, this function assumes the output buffer is large enough
 to hold all the text generated by executing the vTaskList() API function,
 so the xWriteBufferLen parameter is not used. */
 ( void ) xWriteBufferLen;
 /* pcWriteBuffer is used directly as the vTaskList() parameter, so the table
 generated by executing vTaskList() is written directly into the output
 buffer. */
 //vTaskList( pcWriteBuffer );
    sprintf(pcWriteBuffer, taskListHdr);
    pcWriteBuffer += strlen(taskListHdr);
    vTaskList(pcWriteBuffer);

 /* The entire table was written directly to the output buffer. Execution
 of this command is complete, so return pdFALSE. */
 return pdFALSE;
}

static const xCommandLineInput xTaskStatsCommand = {"task-stats",
            "task-stats: Displays a table of task state information\r\n",
            prvTaskStatsCommand,
            0};


/*
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

/*
static const CLI_Command_Definition_t xTaskStatsCommand =
{
	"TaskStats",
	"\r\nhelp:\r\n Lists all the currently running tasks\r\n\r\n",
	prvTaskStatsCommand,
	0
};
 */