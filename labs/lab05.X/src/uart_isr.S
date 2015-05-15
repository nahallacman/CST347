#include "ISR_Support.h"

    .set	nomips16
	.set 	noreorder

    .extern vUART2_ISR
	.extern xISRStackTop
    .global vUART2_ISR_Wrapper
    .set noreorder
    .set noat
    .ent vUART2_ISR_Wrapper

vUART2_ISR_Wrapper:
    portSAVE_CONTEXT

    jal vUART2_ISR
    nop

    portRESTORE_CONTEXT

    .end vUART2_ISR_Wrapper